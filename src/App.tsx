import { useEffect, useState, useCallback } from 'react';
import { Plot, MarketConfig } from './types.ts';
import { getUserId } from './utils.ts';
import { playSuccessChime } from './audio.ts';
import Grid from './components/Grid.tsx';
import SelectionPanel from './components/SelectionPanel.tsx';
import PurchaseModal from './components/PurchaseModal.tsx';
import TakeoverModal from './components/TakeoverModal.tsx';
import SuccessModal from './components/SuccessModal.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('sound_enabled') === 'true');
  const [purchaseDetails, setPurchaseDetails] = useState<{brandName: string; logo: string; websiteUrl: string} | null>(null);

  useEffect(() => {
    localStorage.setItem('sound_enabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);

  const [focusedPlots, setFocusedPlots] = useState<Plot[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const anyModalOpen = isPurchaseModalOpen || isSuccessModalOpen || isAdminPanelOpen || isRulesModalOpen || focusedPlots !== null;

      if (e.key === 'Escape') {
        if (!anyModalOpen && selectedPlots.length > 0) {
          setSelectedPlots([]);
        } else if (focusedPlots !== null && !isPurchaseModalOpen) {
          setFocusedPlots(null);
        }
      } else if (e.key === 'Enter') {
        if (!anyModalOpen && selectedPlots.length > 0) {
          setIsPurchaseModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlots, isPurchaseModalOpen, isSuccessModalOpen, isAdminPanelOpen, isRulesModalOpen, focusedPlots]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      const pendingStr = localStorage.getItem('pendingPurchase');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          executePurchase(pending);
        } catch (e) {
          console.error(e);
        }
        localStorage.removeItem('pendingPurchase');
      }
      // Remove query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [plotsRes, configRes] = await Promise.all([
        fetch('/api/plots'),
        fetch('/api/config')
      ]);
      const plotsData = await plotsRes.json();
      const configData = await configRes.json();
      setPlots(plotsData);
      setConfig(configData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePlotClick = (plot: Plot, mergedPlots?: Plot[]) => {
    if (plot.status === 'owned') {
      setFocusedPlots(mergedPlots ? mergedPlots : [plot]);
      return;
    }

    if (mergedPlots) {
      // Unselect merged blocks
      const mergedIds = mergedPlots.map(p => p.id);
      setSelectedPlots(prev => prev.filter(id => !mergedIds.includes(id)));
      return;
    }

    if (selectedPlots.includes(plot.id)) {
      setSelectedPlots(prev => prev.filter(id => id !== plot.id));
    } else {
      if (!config) return;
      
      if (selectedPlots.length >= 12) {
        showToast("You can only select a maximum of 12 blocks.");
        return;
      }
      
      if (selectedPlots.length > 0) {
        const isAdjacent = selectedPlots.some(id => {
          const p = plots.find(p => p.id === id);
          if (!p) return false;
          const rowDiff = Math.abs(plot.row - p.row);
          const colDiff = Math.abs(plot.col - p.col);
          return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        });

        if (!isAdjacent) {
          showToast(`Please select an adjacent block.`);
          return;
        }
      }

      setSelectedPlots(prev => [...prev, plot.id]);
    }
  };

  const handleTakeover = (plotsToTake: Plot[]) => {
    setFocusedPlots(null);
    setSelectedPlots(plotsToTake.map(p => p.id));
    setIsPurchaseModalOpen(true);
  };

  const handleProceedToPayment = async (details: {brandName: string; logo: string; websiteUrl: string}) => {
    setPurchaseDetails(details);
    setIsPurchaseModalOpen(false);
    
    localStorage.setItem('pendingPurchase', JSON.stringify({
      plotIds: selectedPlots,
      details
    }));
    
    try {
      const res = await fetch('/api/create-dodo-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotIds: selectedPlots })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      showToast(err.message || 'Error connecting to payment provider.');
    }
  };

  const executePurchase = async (storedData: any) => {
    try {
      const payload = {
        plotIds: storedData.plotIds,
        ownerId: getUserId(),
        ...storedData.details
      };

      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete purchase.');
      }

      setPurchaseDetails(storedData.details);
      setSelectedPlots(storedData.plotIds);
      if (isSoundEnabled) playSuccessChime();
      setIsSuccessModalOpen(true);
      loadData();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const claimedSpots = plots.filter(p => p.status === 'owned').length;
  const totalSpots = config?.totalRows ? config.totalRows * config.totalColumns : 288;

  useEffect(() => {
    if (!config || !plots.length) return;
    const initialPriceFormatted = `$${(config.initialPrice / 100).toFixed(2)}`;
    
    const dynamicTitle = `Take The Spot | ${claimedSpots} / ${totalSpots} Spots Taken`;
    const dynamicDesc = `Own your piece of the grid starting at ${initialPriceFormatted} per plot. Join the digital marketplace.`;

    document.title = dynamicTitle;

    const updateMeta = (selector: string, content: string) => {
      const tag = document.querySelector(selector);
      if (tag) tag.setAttribute('content', content);
    };

    updateMeta('meta[name="description"]', dynamicDesc);
    updateMeta('meta[property="og:title"]', dynamicTitle);
    updateMeta('meta[property="og:description"]', dynamicDesc);
    updateMeta('meta[name="twitter:title"]', dynamicTitle);
    updateMeta('meta[name="twitter:description"]', dynamicDesc);
  }, [claimedSpots, totalSpots, config]);

  return (
    <div className="h-[100dvh] w-screen bg-[#F5F8EC] text-[#111511] font-sans selection:bg-[#C8E87A] flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <header className="w-full h-14 bg-white border-b border-[#C9D7B5] flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-sm relative">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-[#17351F]">
          Take The Spot
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold bg-[#F5F8EC] px-2 py-1 rounded hidden sm:block">
            {claimedSpots} / {totalSpots} SPOTS TAKEN
          </p>
          <button 
            onClick={() => setIsRulesModalOpen(true)}
            className="text-[10px] font-bold uppercase tracking-widest text-white bg-[#17351F] hover:bg-[#2a5a35] px-3 py-1.5 rounded-sm transition-colors shadow-sm"
          >
            How to play
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 w-full relative z-10 overflow-hidden">
        <Grid 
          plots={plots} 
          selectedPlots={selectedPlots} 
          onPlotClick={handlePlotClick} 
          config={config || {
            totalRows: 12,
            totalColumns: 24,
            initialPrice: 100,
            maxInitialPlotsPerUser: 2,
            ownershipDurationDays: 90,
            takeoverMultiplier: 2.5
          }}
          isLoading={isLoading}
        />
      </main>

      {/* Floating Selection Panel */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="pointer-events-auto">
          {selectedPlots.length > 0 && !isPurchaseModalOpen && config && (
            <SelectionPanel 
              selectedIds={selectedPlots}
              plots={plots}
              onClear={() => setSelectedPlots([])}
              onCheckout={() => setIsPurchaseModalOpen(true)}
              config={config}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full shrink-0 h-8 bg-[#17351F] text-[#F5F8EC]/70 flex items-center justify-between px-6 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold z-20">
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} TAKE THE SPOT</span>
        </div>
        <span className="hidden sm:inline">
          {config ? `$${(config.initialPrice / 100).toFixed(2)} PER PLOT` : ''}
        </span>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111511] text-white px-4 py-2 rounded shadow-xl text-xs uppercase tracking-widest font-medium pointer-events-none transition-all duration-300">
            {toastMessage}
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {isAdminPanelOpen && (
        <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
      )}

      {isPurchaseModalOpen && config && (
        <PurchaseModal 
          selectedIds={selectedPlots}
          plots={plots}
          config={config}
          onClose={() => setIsPurchaseModalOpen(false)}
          onProceed={handleProceedToPayment}
        />
      )}

      

      {/* Rules Modal */}
      <RulesModal 
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {isSuccessModalOpen && purchaseDetails && (
        <SuccessModal
          plots={selectedPlots.map(id => plots.find(p => p.id === id)).filter(Boolean) as Plot[]}
          brandName={purchaseDetails.brandName}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setSelectedPlots([]);
            setPurchaseDetails(null);
          }}
        />
      )}

      {focusedPlots && config && (
        <TakeoverModal 
          plots={focusedPlots}
          config={config}
          onClose={() => setFocusedPlots(null)}
          onAcquire={() => handleTakeover(focusedPlots)}
        />
      )}
    </div>
  );
}
