import { useState, useEffect } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency } from '../utils.ts';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('adminToken'));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'plots' | 'config'>('plots');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plotsRes, configRes] = await Promise.all([
        fetch('/api/plots'),
        fetch('/api/config')
      ]);
      if (plotsRes.ok) setPlots(await plotsRes.json());
      if (plotsRes.status === 401 || configRes.status === 401) handleLogout();
      if (configRes.ok) setConfig(await configRes.json());
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Error logging in');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  const ownedPlots = plots.filter(p => p.status === 'owned');

  const handleRevoke = async (plotId: string) => {
    if (!confirm(`Are you sure you want to revoke ownership of plot ${plotId}?`)) return;
    
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`/api/admin/revoke`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plotId })
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to revoke plot.");
        if (res.status === 401) handleLogout();
      }
    } catch (e) {
      console.error(e);
      alert("Error revoking plot.");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert("Config saved successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save config.");
        if (res.status === 401) handleLogout();
      }
    } catch (e) {
      console.error(e);
      alert("Error saving config.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111511]/80 backdrop-blur-sm">
        <div className="bg-[#F5F8EC] w-full max-w-sm rounded-sm shadow-xl flex flex-col border border-[#C9D7B5] p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <h2 className="text-xl font-black text-[#17351F] uppercase tracking-widest font-serif mb-6">Admin Access</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] bg-white text-sm" />
            </div>
            {loginError && <p className="text-red-600 text-xs font-bold">{loginError}</p>}
            <button type="submit" className="w-full bg-[#17351F] text-white py-3 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a5a35] transition-colors shadow-sm">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111511]/80 backdrop-blur-sm">
      <div className="bg-[#F5F8EC] w-full max-w-4xl max-h-[80vh] rounded-sm shadow-xl flex flex-col border border-[#C9D7B5]">
        
        <div className="flex justify-between items-center p-6 border-b border-[#C9D7B5] bg-white rounded-t-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-[#17351F] uppercase tracking-widest font-serif">Admin Panel</h2>
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('plots')}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'plots' ? 'text-[#17351F] underline decoration-[#C8E87A] underline-offset-4' : 'text-[#17351F]/50 hover:text-[#17351F]'}`}
              >
                Database
              </button>
              <button 
                onClick={() => setActiveTab('config')}
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'config' ? 'text-[#17351F] underline decoration-[#C8E87A] underline-offset-4' : 'text-[#17351F]/50 hover:text-[#17351F]'}`}
              >
                Market Config
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-[10px] uppercase font-bold tracking-wider text-[#17351F]/60 hover:text-[#17351F]">Logout</button>
            <button onClick={onClose} className="text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="w-full h-32 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#C9D7B5] border-t-[#17351F] rounded-full animate-spin"></div>
            </div>
          ) : activeTab === 'plots' ? (
            ownedPlots.length === 0 ? (
              <div className="text-center text-[#17351F]/50 py-12 text-sm uppercase tracking-wider font-bold">No owned plots yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#C9D7B5]">
                    <th className="pb-3 text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold">Plot ID</th>
                    <th className="pb-3 text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold">Brand Name</th>
                    <th className="pb-3 text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold">Owner ID</th>
                    <th className="pb-3 text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold">Current Price</th>
                    <th className="pb-3 text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ownedPlots.map(plot => (
                    <tr key={plot.id} className="border-b border-[#C9D7B5]/30 hover:bg-white transition-colors">
                      <td className="py-3 font-mono text-sm font-bold text-[#17351F]">{plot.id}</td>
                      <td className="py-3 text-sm font-bold text-[#17351F] flex items-center gap-2">
                        {plot.logo && <img src={plot.logo} alt="" className="w-6 h-6 object-contain" />}
                        {plot.brandName}
                      </td>
                      <td className="py-3 text-xs font-mono text-[#17351F]/70">{plot.ownerId?.substring(0, 8)}...</td>
                      <td className="py-3 font-mono text-sm text-[#17351F]">{formatCurrency(plot.currentPrice)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRevoke(plot.id)}
                          className="px-3 py-1 bg-[#17351F]/10 hover:bg-[#17351F]/20 text-[#17351F] text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : config && (
            <form onSubmit={handleSaveConfig} className="max-w-2xl mx-auto flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Initial Price (cents)</label>
                  <input type="number" value={config.initialPrice} onChange={e => setConfig({...config, initialPrice: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Takeover Multiplier</label>
                  <input type="number" step="0.1" value={config.takeoverMultiplier} onChange={e => setConfig({...config, takeoverMultiplier: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Ownership Duration (Days)</label>
                  <input type="number" value={config.ownershipDurationDays} onChange={e => setConfig({...config, ownershipDurationDays: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Max Init Plots/User</label>
                  <input type="number" value={config.maxInitialPlotsPerUser} onChange={e => setConfig({...config, maxInitialPlotsPerUser: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] bg-white text-sm" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-[#17351F] text-white py-3 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a5a35] transition-colors shadow-sm self-start px-8">Save Configuration</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
