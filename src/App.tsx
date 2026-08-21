import { useEffect, useState, useCallback } from 'react';
import { Plot, MarketConfig } from './types.ts';
import { getUserId } from './utils.ts';
import { playSuccessChime } from './audio.ts';
import Grid from './components/Grid.tsx';
import SelectionPanel from './components/SelectionPanel.tsx';
import PurchaseModal from './components/PurchaseModal.tsx';
import TakeoverModal from './components/TakeoverModal.tsx';
import PaymentModal from './components/PaymentModal.tsx';
import SuccessModal from './components/SuccessModal.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('sound_enabled') === 'true');
  const [purchaseDetails, setPurchaseDetails] = useState<{brandName: string; logo: string; websiteUrl: string} | null>(null);

  useEffect(() => {
    localStorage.setItem('sound_enabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);

  const [focusedPlots, setFocusedPlots] = useState<Plot[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePlotClick = (plot: Plot, siblingPlot?: Plot) => {
    if (plot.status === 'owned') {
      setFocusedPlots(siblingPlot ? [plot, siblingPlot] : [plot]);
      return;
    }

    if (siblingPlot) {
      // Unselect merged blocks
      setSelectedPlots(prev => prev.filter(id => id !== plot.id && id !== siblingPlot.id));
      return;
    }

    if (selectedPlots.includes(plot.id)) {
      setSelectedPlots(prev => prev.filter(id => id !== plot.id));
    } else {
      if (!config) return;
      if (selectedPlots.length >= config.maxInitialPlotsPerUser) {
        showToast(`You can select only ${config.maxInitialPlotsPerUser} plots right now.`);
        return;
      }
      if (selectedPlots.length === 1) {
        const firstId = selectedPlots[0];
        const firstPlot = plots.find(p => p.id === firstId);
        if (firstPlot) {
          const rowDiff = Math.abs(plot.row - firstPlot.row);
          const colDiff = Math.abs(plot.col - firstPlot.col);
          if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
            showToast(`Please select an adjacent plot (up, down, left, right).`);
            return;
          }
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

  const handleProceedToPayment = (details: {brandName: string; logo: string; websiteUrl: string}) => {
    setPurchaseDetails(details);
    setIsPurchaseModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const executePurchase = async () => {
    if (!purchaseDetails) return;
    
    // TODO: Integrate actual payment gateway logic here
    // Swap this simulated fetch with a real payment provider SDK (like Stripe, Razorpay, or PayPal).
    // The payment provider will give you a token/intent which should be sent to your backend for verification.
    try {
      const payload = {
        plotIds: selectedPlots,
        ownerId: getUserId(),
        ...purchaseDetails
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

      setIsPaymentModalOpen(false);
      if (isSoundEnabled) playSuccessChime();
      setIsSuccessModalOpen(true);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'An error occurred during purchase.');
      setIsPaymentModalOpen(false);
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
    <div className="h-[100dvh] w-screen bg-[#F5F8EC] text-[#111511] font-sans selection:bg-[#C8E87A] overflow-hidden relative flex flex-col items-center justify-center">
      {/* Floating Status Micro-UI */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 pointer-events-none flex flex-col items-end gap-2">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold bg-[#F5F8EC]/80 px-2 py-1 rounded backdrop-blur-sm">
          {claimedSpots} / {totalSpots} SPOTS TAKEN
        </p>
      </div>

      {/* Main Canvas */}
      <main className="w-full h-full relative z-10">
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
      <footer className="absolute bottom-0 w-full h-8 bg-[#17351F] text-[#F5F8EC]/70 flex items-center justify-between px-6 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold z-20">
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

      {isPaymentModalOpen && config && purchaseDetails && (
        <PaymentModal
          amount={selectedPlots.map(id => plots.find(p => p.id === id)).filter(Boolean).reduce((sum, plot) => sum + (plot!.status === 'available' ? plot!.currentPrice : Math.round(plot!.currentPrice * config.takeoverMultiplier)), 0)}
          plots={selectedPlots.map(id => plots.find(p => p.id === id)).filter(Boolean) as Plot[]}
          onSuccess={executePurchase}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      )}

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
