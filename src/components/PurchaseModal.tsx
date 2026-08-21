import { useState } from 'react';
import { Plot, MarketConfig, PurchaseRequest } from '../types.ts';
import { formatCurrency, getUserId } from '../utils.ts';
import { motion } from 'motion/react';

interface PurchaseModalProps {
  selectedIds: string[];
  plots: Plot[];
  config: MarketConfig;
  onClose: () => void;
  onProceed: (details: {brandName: string; logo: string; websiteUrl: string}) => void;
}

export default function PurchaseModal({ selectedIds, plots, config, onClose, onProceed }: PurchaseModalProps) {
  const [brandName, setBrandName] = useState('');
  const [logo, setLogo] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedPlots = selectedIds.map(id => plots.find(p => p.id === id)).filter(Boolean) as Plot[];
  
  const totalCost = selectedPlots.reduce((sum, plot) => {
    if (plot.status === 'available') {
      return sum + plot.currentPrice;
    } else {
      return sum + Math.round(plot.currentPrice * config.takeoverMultiplier);
    }
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName) {
      setError("Brand name is required");
      return;
    }
    onProceed({ brandName, logo, websiteUrl });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111511]/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-sm shadow-xl overflow-hidden my-auto border border-[#C9D7B5]"
      >
        <div className="px-6 py-5 border-b border-[#C9D7B5] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#17351F] uppercase tracking-wider">Take The Spot</h2>
          <button onClick={onClose} className="text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="brandName" className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Brand / Website Name</label>
              <input
                id="brandName"
                type="text"
                required
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] transition-shadow bg-[#F5F8EC] focus:bg-white text-sm"
                placeholder="Acme Corp"
              />
            </div>

    <div>
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Brand Logo</label>
              
              <div className="relative border-2 border-dashed border-[#C9D7B5] rounded-sm bg-[#F5F8EC] hover:bg-white transition-colors group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        setError('Logo file must be less than 2MB');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLogo(reader.result as string);
                        setError(null);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="p-4 flex flex-col items-center justify-center min-h-[120px] text-center">
                  {logo ? (
                    <div className="relative">
                      <img src={logo} alt="Logo preview" className="w-16 h-16 object-contain mb-2" />
                      <div className="text-[10px] text-[#17351F] font-bold underline decoration-[#C9D7B5] underline-offset-4">Change Image</div>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-[#17351F]/40 group-hover:text-[#17351F] group-hover:scale-110 transition-all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <span className="text-[11px] font-bold text-[#17351F]">Click or drag image to upload</span>
                      <span className="text-[9px] text-[#17351F]/50 mt-1">PNG, JPG up to 2MB</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-[10px] uppercase font-bold tracking-widest text-[#17351F]/60 mb-1.5">Website URL</label>
              <input
                id="websiteUrl"
                type="url"
                required
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#C8E87A] transition-shadow bg-[#F5F8EC] focus:bg-white text-sm"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="mt-8 bg-[#F5F8EC] p-5 border border-[#C9D7B5]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#17351F]/60">Your Plots</span>
              <span className="font-mono text-[#17351F] font-bold text-sm">{selectedIds.join(', ')}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#17351F]/60">Duration</span>
              <span className="font-mono text-[#17351F] font-bold text-sm">{config.ownershipDurationDays} months</span>
            </div>
            <div className="h-px w-full bg-[#C9D7B5] my-4"></div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#17351F]/60 mb-1">Total</span>
              <span className="text-2xl font-mono font-bold text-[#17351F]">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-sm text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-[#C8E87A] text-[#17351F] py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#b5d36e] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {`CONTINUE TO PAYMENT ->`}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
