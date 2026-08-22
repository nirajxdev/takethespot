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
import { Analytics } from '@vercel/analytics/react';

const PENDING_CHECKOUT_KEY = 'tts_dodo_checkout';

type PendingClientCheckout = {
  checkoutId: string;
  plotIds: string[];
  brandName: string;
  logo: string;
  websiteUrl: string;
};

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
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [plotsRes, configRes] = await Promise.all([
        fetch('/api/plots'),
        fetch('/api/config')
      ]);

      const plotsData = await plotsRes.json().catch(() => null);
      const configData = await configRes.json().catch(() => null);

      if (!plotsRes.ok || !Array.isArray(plotsData)) {
        const message =
          (plotsData && typeof plotsData === 'object' && 'error' in plotsData && typeof plotsData.error === 'string'
            ? plotsData.error
            : null) ||
          `Could not load plots (${plotsRes.status}). The API may be down or DATABASE_URL is missing on Vercel.`;
        throw new Error(message);
      }

      if (!configRes.ok || !configData || typeof configData !== 'object' || 'error' in configData && !('initialPrice' in configData)) {
        const message =
          (configData && typeof configData === 'object' && 'error' in configData && typeof configData.error === 'string'
            ? configData.error
            : null) ||
          `Could not load config (${configRes.status}).`;
        throw new Error(message);
      }

      setPlots(plotsData);
      setConfig(configData as MarketConfig);
      setPersistenceWarning(
        typeof configData.persistenceWarning === 'string' ? configData.persistenceWarning : null
      );
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load the grid.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/$/, "");
    if (params.get("admin") === "1" || path === "/admin") {
      setIsAdminPanelOpen(true);
    }
    if (params.get("paid") === "0") {
      showToast("Checkout was cancelled. No plots were claimed.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") !== "1") return;

    const checkoutId = params.get("checkout") || "";
    let stored: PendingClientCheckout | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
      stored = raw ? (JSON.parse(raw) as PendingClientCheckout) : null;
    } catch {
      stored = null;
    }

    const plotIds = stored?.plotIds ?? [];
    if (stored) {
      setSelectedPlots(stored.plotIds);
      setPurchaseDetails({
        brandName: stored.brandName,
        logo: stored.logo,
        websiteUrl: stored.websiteUrl,
      });
    }

    setIsPaymentModalOpen(false);
    setIsConfirmingPayment(true);

    let cancelled = false;
    const started = Date.now();
    const ownerId = getUserId();

    const finishUrl = () => {
      window.history.replaceState({}, "", window.location.pathname);
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        if (checkoutId) {
          const res = await fetch(
            `/api/checkout/${encodeURIComponent(checkoutId)}?ownerId=${encodeURIComponent(ownerId)}`
          );
          const data = await res.json().catch(() => null);
          if (res.ok && data?.status === "completed") {
            await loadData();
            if (isSoundEnabled) playSuccessChime();
            setIsConfirmingPayment(false);
            setIsSuccessModalOpen(true);
            sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
            finishUrl();
            return;
          }
          if (res.ok && data?.status === "failed") {
            setIsConfirmingPayment(false);
            showToast(data.error || "Payment could not be applied to plots.");
            sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
            finishUrl();
            return;
          }
        }

        const plotsRes = await fetch("/api/plots");
        const plotsData = await plotsRes.json().catch(() => null);
        if (plotsRes.ok && Array.isArray(plotsData) && plotIds.length) {
          const owned = plotIds.every((id) => {
            const plot = plotsData.find((p: Plot) => p.id === id);
            return plot && plot.ownerId === ownerId && plot.status === "owned";
          });
          if (owned) {
            setPlots(plotsData);
            if (isSoundEnabled) playSuccessChime();
            setIsConfirmingPayment(false);
            setIsSuccessModalOpen(true);
            sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
            finishUrl();
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }

      if (Date.now() - started > 90_000) {
        setIsConfirmingPayment(false);
        showToast("Payment may still be processing. Refresh in a moment if your spots are not claimed yet.");
        finishUrl();
        return;
      }

      window.setTimeout(tick, 1500);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [isSoundEnabled, loadData]);

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

  const startDodoCheckout = async () => {
    if (!purchaseDetails) return;

    const payload = {
      plotIds: selectedPlots,
      ownerId: getUserId(),
      ...purchaseDetails,
    };

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.checkoutUrl) {
      throw new Error(
        (data && typeof data.error === "string" && data.error) ||
          "Could not start Dodo checkout."
      );
    }

    const pending: PendingClientCheckout = {
      checkoutId: data.checkoutId,
      plotIds: selectedPlots,
      ...purchaseDetails,
    };
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
    window.location.href = data.checkoutUrl;
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
      <Analytics />
      {/* Floating Status Micro-UI */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 pointer-events-none flex flex-col items-end gap-2">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#17351F]/60 font-bold bg-[#F5F8EC]/80 px-2 py-1 rounded backdrop-blur-sm">
          {claimedSpots} / {totalSpots} SPOTS TAKEN
        </p>
      </div>

      {/* Persistence / load banners */}
      {persistenceWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-lg px-4 py-2 bg-[#111511] text-[#C8E87A] text-[10px] sm:text-xs uppercase tracking-wider text-center rounded-sm shadow-lg">
          {persistenceWarning}
        </div>
      )}

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
          isLoading={isLoading && plots.length === 0}
        />
        {!isLoading && (loadError || plots.length === 0) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#C9D7B5]/90 p-6">
            <div className="max-w-md bg-[#F5F8EC] border border-[#17351F]/20 p-6 text-center shadow-lg">
              <p className="text-sm font-black uppercase tracking-widest text-[#17351F] mb-2">
                {loadError ? 'Could not load the grid' : 'No plots to display'}
              </p>
              <p className="text-xs text-[#17351F]/70 mb-4 leading-relaxed">
                {loadError || 'The API returned an empty board. If this is production, set DATABASE_URL (Neon) in the Vercel project Environment Variables and redeploy.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  loadData();
                }}
                className="px-6 py-2 bg-[#17351F] text-[#F5F8EC] text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a5a35]"
              >
                Retry
              </button>
            </div>
          </div>
        )}
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsAdminPanelOpen(true)}
            className="uppercase tracking-[0.2em] hover:text-[#C8E87A] transition-colors"
          >
            Admin
          </button>
          <span className="hidden sm:inline">
            {config ? `$${(config.initialPrice / 100).toFixed(2)} PER PLOT` : ''}
          </span>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111511] text-white px-4 py-2 rounded shadow-xl text-xs uppercase tracking-widest font-medium pointer-events-none transition-all duration-300">
            {toastMessage}
          </div>
        )}
      </AnimatePresence>

      {isConfirmingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111511]/50 backdrop-blur-sm p-6">
          <div className="bg-white border border-[#C9D7B5] px-8 py-6 text-center max-w-sm shadow-xl">
            <div className="mx-auto mb-3 w-6 h-6 border-2 border-[#17351F]/20 border-t-[#17351F] rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-[#17351F]">
              Confirming payment
            </p>
            <p className="mt-2 text-[11px] text-[#17351F]/70 leading-relaxed">
              Waiting for Dodo to verify the charge. Your spots will appear as soon as the webhook completes.
            </p>
          </div>
        </div>
      )}
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
          onPay={startDodoCheckout}
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
