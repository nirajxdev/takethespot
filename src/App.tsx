import { useEffect, useState, useCallback, lazy, Suspense, useRef } from 'react';
import { Plot, MarketConfig, Transaction } from './types.ts';
import { getUserId, hydratePlots, formatCurrency } from './utils.ts';
import { playSuccessChime } from './audio.ts';
import Grid from './components/Grid.tsx';
import SelectionPanel from './components/SelectionPanel.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import {
  Sparkles,
  ArrowRight,
  Globe,
  Briefcase,
  Laugh,
  AtSign,
  Palette,
  Layers,
  Flame,
  ChevronDown,
  X,
} from 'lucide-react';

const PurchaseModal = lazy(() => import('./components/PurchaseModal.tsx'));
const TakeoverModal = lazy(() => import('./components/TakeoverModal.tsx'));
const PaymentModal = lazy(() => import('./components/PaymentModal.tsx'));
const SuccessModal = lazy(() => import('./components/SuccessModal.tsx'));
const AdminPanel = lazy(() => import('./components/AdminPanel.tsx'));
const RulesModal = lazy(() =>
  import('./components/RulesModal.tsx').then((m) => ({ default: m.RulesModal }))
);

const PENDING_CHECKOUT_KEY = 'tts_dodo_checkout';
const ONBOARDING_DISMISSED_KEY = 'tts_onboarding_dismissed';

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
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('sound_enabled') === 'true');
  const [purchaseDetails, setPurchaseDetails] = useState<{ brandName: string; logo: string; websiteUrl: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== 'true');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

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
      let boardRes = await fetch('/api/board');
      let boardData = await boardRes.json().catch(() => null);

      if (!boardRes.ok || !boardData || !Array.isArray(boardData.plots)) {
        const [plotsRes, configRes] = await Promise.all([
          fetch('/api/plots'),
          fetch('/api/config'),
        ]);
        const plotsData = await plotsRes.json().catch(() => null);
        const configData = await configRes.json().catch(() => null);
        if (plotsRes.ok && Array.isArray(plotsData) && configRes.ok && configData && typeof configData === 'object') {
          boardData = { plots: plotsData, config: configData };
          boardRes = plotsRes;
        }
      }

      if (!boardRes.ok || !boardData || !Array.isArray(boardData.plots)) {
        const message =
          (boardData && typeof boardData === 'object' && 'error' in boardData && typeof boardData.error === 'string'
            ? boardData.error
            : null) ||
          `Could not load plots (${boardRes.status}). The API may be down or DATABASE_URL is missing on Vercel.`;
        throw new Error(message);
      }

      const configData = boardData.config;
      if (!configData || typeof configData !== 'object' || !('initialPrice' in configData)) {
        throw new Error('Could not load config.');
      }

      setPlots(hydratePlots(boardData.plots));
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

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions/recent');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentTransactions(data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  };

  const scrollToGrid = () => {
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleClaimClick = () => {
    if (selectedPlots.length > 0) {
      setIsPurchaseModalOpen(true);
    } else {
      scrollToGrid();
      showToast('Choose an available spot on the board to continue.');
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    loadData().finally(() => {
      fetchTransactions();
      interval = setInterval(() => {
        loadData();
        fetchTransactions();
      }, 8000);
    });
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadData, fetchTransactions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const anyModalOpen =
        isPurchaseModalOpen ||
        isPaymentModalOpen ||
        isSuccessModalOpen ||
        isAdminPanelOpen ||
        isRulesModalOpen ||
        focusedPlots !== null;

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
  }, [selectedPlots, isPurchaseModalOpen, isPaymentModalOpen, isSuccessModalOpen, isAdminPanelOpen, isRulesModalOpen, focusedPlots]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/$/, '');
    if (params.get('admin') === '1' || path === '/admin') {
      setIsAdminPanelOpen(true);
    }
    if (params.get('paid') === '0') {
      showToast('Checkout was cancelled. No spots were claimed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;

    const checkoutId = params.get('checkout') || '';
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
      window.history.replaceState({}, '', window.location.pathname);
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        if (checkoutId) {
          const res = await fetch(
            `/api/checkout/${encodeURIComponent(checkoutId)}?ownerId=${encodeURIComponent(ownerId)}`
          );
          const data = await res.json().catch(() => null);
          if (res.ok && data?.status === 'completed') {
            await loadData();
            if (isSoundEnabled) playSuccessChime();
            setIsConfirmingPayment(false);
            setIsSuccessModalOpen(true);
            sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
            finishUrl();
            return;
          }
          if (res.ok && data?.status === 'failed') {
            setIsConfirmingPayment(false);
            showToast(data.error || 'Payment could not be applied to spots.');
            sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
            finishUrl();
            return;
          }
        }

        const plotsRes = await fetch('/api/plots');
        const plotsData = await plotsRes.json().catch(() => null);
        if (plotsRes.ok && Array.isArray(plotsData) && plotIds.length) {
          const owned = plotIds.every((id) => {
            const plot = plotsData.find((p: Plot) => p.id === id);
            return plot && plot.ownerId === ownerId && plot.status === 'owned';
          });
          if (owned) {
            setPlots(hydratePlots(plotsData));
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
        showToast('Payment may still be processing. Refresh in a moment if your spots are not claimed yet.');
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

  const handlePlotClick = (plot: Plot, mergedPlots?: Plot[]) => {
    if (plot.status === 'owned') {
      setFocusedPlots(mergedPlots ? mergedPlots : [plot]);
      return;
    }

    if (mergedPlots) {
      const mergedIds = mergedPlots.map((p) => p.id);
      setSelectedPlots((prev) => prev.filter((id) => !mergedIds.includes(id)));
      return;
    }

    if (selectedPlots.includes(plot.id)) {
      setSelectedPlots((prev) => prev.filter((id) => id !== plot.id));
    } else {
      if (!config) return;

      const ownerId = getUserId();
      const remaining =
        config.maxPlotsPerUser -
        plots.filter((p) => p.ownerId === ownerId).length;

      if (remaining <= 0) {
        showToast(`You already hold ${config.maxPlotsPerUser} spots, the maximum allowed.`);
        return;
      }

      if (selectedPlots.length >= remaining) {
        showToast(
          remaining === config.maxPlotsPerUser
            ? `You may select up to ${config.maxPlotsPerUser} spots.`
            : `You may hold ${config.maxPlotsPerUser} spots in total. ${remaining} remaining.`
        );
        return;
      }

      if (selectedPlots.length > 0) {
        const isAdjacent = selectedPlots.some((id) => {
          const p = plots.find((p) => p.id === id);
          if (!p) return false;
          const rowDiff = Math.abs(plot.row - p.row);
          const colDiff = Math.abs(plot.col - p.col);
          return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        });

        if (!isAdjacent) {
          showToast('Select a spot that shares an edge with your current selection.');
          return;
        }
      }

      setSelectedPlots((prev) => [...prev, plot.id]);
    }
  };

  const handleTakeover = (plotsToTake: Plot[]) => {
    if (!config) return;
    const remaining =
      config.maxPlotsPerUser -
      plots.filter((p) => p.ownerId === getUserId()).length;
    if (plotsToTake.length > remaining) {
      showToast(
        remaining === 0
          ? `You already hold ${config.maxPlotsPerUser} spots, the maximum allowed.`
          : `You may hold ${config.maxPlotsPerUser} spots in total. ${remaining} remaining.`
      );
      return;
    }
    setFocusedPlots(null);
    setSelectedPlots(plotsToTake.map((p) => p.id));
    setIsPurchaseModalOpen(true);
  };

  const handleProceedToPayment = (details: { brandName: string; logo: string; websiteUrl: string }) => {
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

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.checkoutUrl) {
      throw new Error(
        (data && typeof data.error === 'string' && data.error) ||
          'Could not start Dodo checkout.'
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

  const claimedSpots = plots.filter((p) => p.status === 'owned').length;
  const totalSpots = config?.totalRows ? config.totalRows * config.totalColumns : 288;
  const remainingSpots = Math.max(0, totalSpots - claimedSpots);
  const percentageClaimed = Math.round((claimedSpots / totalSpots) * 100);

  useEffect(() => {
    if (!config || !plots.length) return;
    const initialPriceFormatted = `$${(config.initialPrice / 100).toFixed(2)}`;
    const dynamicTitle = `Take The Spot | ${claimedSpots} / ${totalSpots} Spots Taken`;
    const dynamicDesc = `Claim your permanent spot on this limited 288-square internet board for ${initialPriceFormatted}.`;

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

  const faqs = [
    {
      q: "What is TakeTheSpot.lol?",
      a: "TakeTheSpot is a shared digital board with a fixed limit of 288 spots. You can claim any open spot for $1 and associate it with your website, portfolio, startup, meme, art, or online handle.",
    },
    {
      q: "How much does a spot cost?",
      a: "Each available spot costs $1.00 USD. There are no hidden fees. Once claimed, your spot belongs to you for 90 days.",
    },
    {
      q: "Do I need to upload a logo?",
      a: "No! Custom logo upload is completely optional. When you enter your website URL, we automatically detect your site's logo or favicon. If you don't have a website or logo, we generate a stylish monogram avatar using your name.",
    },
    {
      q: "Can I claim multiple spots together?",
      a: "Yes! You can select up to 12 adjacent spots. When adjacent spots form a rectangle, they automatically merge into a larger, more prominent tile on the board.",
    },
    {
      q: "Can someone take over my spot?",
      a: "Owned spots can be acquired by other visitors if they pay 2.5× the spot's current value. If nobody takes it over, you retain it for 90 days before it returns to the board.",
    },
    {
      q: "How does payment work?",
      a: "Payments are processed securely via Dodo Payments supporting credit cards, debit cards, UPI, and regional payment methods. We never collect or store your financial details.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-tactile text-[#111511] font-sans selection:bg-[#C8E87A] flex flex-col">
      <Analytics />

      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 w-full h-15 bg-white/95 backdrop-blur-md border-b border-[#C9D7B5] flex items-center justify-between px-4 sm:px-8 shrink-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="TakeTheSpot Logo"
              className="h-8.5 w-auto rounded-sm border border-[#17351F]/10 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-[#17351F] font-serif leading-none">
                Take The Spot
              </span>
              <span className="text-[9px] text-[#17351F]/60 tracking-wider hidden md:block">
                Claim a permanent spot on the internet.
              </span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Scarcity Counter */}
          <div className="flex items-center gap-1.5 bg-[#FAFDF5] border border-[#C9D7B5] px-2.5 py-1 rounded-sm text-[9px] sm:text-[10px] font-mono font-bold text-[#17351F]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="hidden sm:inline">{claimedSpots} / {totalSpots} TAKEN</span>
            <span className="sm:hidden">{claimedSpots}/{totalSpots}</span>
            <span className="text-[#17351F]/40 hidden sm:inline">·</span>
            <span className="text-[#17351F]/80 hidden sm:inline">{remainingSpots} LEFT</span>
          </div>

          {/* How It Works Button */}
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#17351F] hover:text-[#2a5a35] hover:bg-[#F5F8EC] px-2.5 sm:px-3 py-1.5 rounded-sm transition-colors border border-transparent hover:border-[#C9D7B5] cursor-pointer"
          >
            How It Works
          </button>

          {/* FAQ Anchor Link */}
          <a
            href="#faq"
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#17351F]/70 hover:text-[#17351F] px-2 py-1.5 rounded-sm transition-colors hidden md:block"
          >
            FAQ
          </a>

          {/* Primary CTA Button */}
          <button
            onClick={handleClaimClick}
            className="bg-[#C8E87A] text-[#17351F] hover:bg-[#b5d36e] active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-sm transition-all shadow-sm flex items-center gap-1.5 border border-[#17351F] cursor-pointer"
          >
            <span>Claim a Spot</span>
            <ArrowRight size={13} className="shrink-0" />
          </button>
        </div>
      </header>

      {/* Persistence Warning Banner */}
      {persistenceWarning && (
        <div className="w-full bg-[#111511] text-[#C8E87A] text-[10px] sm:text-xs uppercase tracking-wider text-center py-2 px-4 shadow-sm border-b border-[#C8E87A]/20">
          {persistenceWarning}
        </div>
      )}

      {/* HERO VIEWPORT CONTAINER - Fits cleanly on screen with balanced margins */}
      <div className="min-h-[calc(100dvh-4.25rem)] flex flex-col justify-between">
        {/* 2. COMPACT INTRO ABOVE THE GRID */}
        <section className="w-full max-w-[94vw] xl:max-w-[1360px] 2xl:max-w-[1440px] mx-auto px-2 sm:px-4 pt-2.5 sm:pt-3 pb-1 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-[#C9D7B5]/60">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black uppercase tracking-tight text-[#17351F] font-serif leading-none shrink-0">
                Take Your Spot.
              </h1>
              <p className="text-xs sm:text-sm text-[#17351F]/80 font-medium">
                Claim one of 288 permanent spots on this shared internet board.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-white border border-[#C9D7B5] px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold text-[#17351F]">
                $1.00 <span className="text-[#17351F]/50 font-normal">/ spot</span>
              </div>

              <button
                onClick={handleClaimClick}
                className="bg-[#17351F] text-[#C8E87A] hover:bg-[#234e2e] active:scale-95 text-[11px] font-black uppercase tracking-[0.14em] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-sm transition-all shadow-sm flex items-center gap-1.5 border border-[#17351F] cursor-pointer"
              >
                <span>Pick a Spot</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* 3. DISMISSIBLE FIRST-TIME VISITOR ONBOARDING */}
          <AnimatePresence>
            {showOnboarding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="bg-[#FAFDF5] border-2 border-[#17351F] rounded-sm p-2.5 sm:p-3 relative shadow-sm">
                  <button
                    onClick={dismissOnboarding}
                    className="absolute top-2 right-2 text-[#17351F]/50 hover:text-[#17351F] p-1 rounded-sm cursor-pointer"
                    title="Dismiss guide"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] bg-[#C8E87A] text-[#17351F] px-2 py-0.5 rounded-xs border border-[#17351F]">
                      Quick Start
                    </span>
                    <span className="text-[11px] font-bold text-[#17351F]">How it works:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="bg-white border border-[#C9D7B5] p-2 rounded-sm">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-4 h-4 rounded-xs bg-[#17351F] text-[#C8E87A] font-mono font-bold text-[9px] flex items-center justify-center">
                          01
                        </span>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-[#17351F]">Pick Any Spot</h4>
                      </div>
                      <p className="text-[10px] text-[#17351F]/70 leading-snug">
                        Click any available square below. You can select up to 12 adjacent squares.
                      </p>
                    </div>

                    <div className="bg-white border border-[#C9D7B5] p-2 rounded-sm">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-4 h-4 rounded-xs bg-[#17351F] text-[#C8E87A] font-mono font-bold text-[9px] flex items-center justify-center">
                          02
                        </span>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-[#17351F]">Make It Yours</h4>
                      </div>
                      <p className="text-[10px] text-[#17351F]/70 leading-snug">
                        Add your project link or name. We auto-detect your logo. Custom upload is optional.
                      </p>
                    </div>

                    <div className="bg-white border border-[#C9D7B5] p-2 rounded-sm">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-4 h-4 rounded-xs bg-[#17351F] text-[#C8E87A] font-mono font-bold text-[9px] flex items-center justify-center">
                          03
                        </span>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-[#17351F]">Join The Board</h4>
                      </div>
                      <p className="text-[10px] text-[#17351F]/70 leading-snug">
                        Pay $1 per spot. Your tile is instantly rendered on the live board for visitors worldwide.
                      </p>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-[#C9D7B5]/60">
                    <span className="text-[9px] text-[#17351F]/60">
                      Spots can also be acquired by others at 2.5× value, keeping the board dynamic.
                    </span>
                    <button
                      onClick={dismissOnboarding}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#17351F] hover:underline cursor-pointer"
                    >
                      Got it, dismiss ✓
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. BOARD STATUS & INTERACTION INSTRUCTION BAR */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/70 backdrop-blur-xs border border-[#C9D7B5] px-3 py-1.5 rounded-sm shadow-2xs">
            <div className="flex items-center gap-1.5 text-[#17351F] font-bold">
              <span className="text-[#17351F] font-mono text-sm">↓</span>
              <span className="uppercase tracking-wider text-[10px] sm:text-[11px] font-mono">
                {selectedPlots.length > 0
                  ? `${selectedPlots.length} SPOT(S) SELECTED (${selectedPlots.join(' · ')}) — CLICK CLAIM TO PROCEED`
                  : 'CLICK ANY EMPTY SQUARE TO CLAIM FOR $1'}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 font-mono text-[9px] sm:text-[10px] font-bold text-[#17351F]">
              <span className="text-[#17351F]/60">BOARD STATUS:</span>
              <span className="font-black text-[#17351F]">{claimedSpots} CLAIMED</span>
              <div className="w-20 sm:w-28 h-2 bg-[#C9D7B5] rounded-xs overflow-hidden border border-[#17351F]/30 flex">
                <div
                  className="h-full bg-[#17351F] transition-all duration-500"
                  style={{ width: `${Math.max(percentageClaimed, 1)}%` }}
                />
              </div>
              <span className="text-[#17351F]/60">288 TOTAL</span>
              <span className="text-[#17351F]/40">·</span>
              <span className="bg-[#C8E87A] text-[#17351F] px-1.5 py-0.5 rounded-xs border border-[#17351F]/40 font-black">
                {remainingSpots} SPOTS LEFT
              </span>
            </div>
          </div>
        </section>

        {/* 5. MAIN INTERACTIVE BOARD */}
        <main ref={gridRef} className="w-full flex-1 flex flex-col items-center justify-center my-auto py-1">
          <Grid
            plots={plots}
            selectedPlots={selectedPlots}
            onPlotClick={handlePlotClick}
            config={
              config || {
                totalRows: 12,
                totalColumns: 24,
                initialPrice: 100,
                maxPlotsPerUser: 12,
                ownershipDurationDays: 90,
                takeoverMultiplier: 2.5,
              }
            }
            isLoading={isLoading && plots.length === 0}
          />

          {!isLoading && (loadError || plots.length === 0) && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#C9D7B5]/90 p-6">
              <div className="max-w-md bg-[#F5F8EC] border-2 border-[#17351F] p-6 text-center shadow-xl">
                <p className="text-sm font-black uppercase tracking-widest text-[#17351F] mb-2">
                  {loadError ? 'Could not load the grid' : 'No plots to display'}
                </p>
                <p className="text-xs text-[#17351F]/70 mb-4 leading-relaxed">
                  {loadError || 'The API returned an empty board.'}
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

        {/* Subtle Bottom Scroll Cue */}
        <div className="w-full text-center pb-2 select-none opacity-40 hover:opacity-90 transition-opacity shrink-0">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#17351F]">
            Scroll for details & live activity ↓
          </span>
        </div>
      </div>

      {/* 5. FLOATING SELECTION PANEL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {selectedPlots.length > 0 && !isPurchaseModalOpen && !isPaymentModalOpen && config && (
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

      {/* 6. BELOW-THE-GRID CONTENT SECTIONS */}
      <div className="w-full bg-white border-t-2 border-[#17351F] mt-6 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 space-y-20">
          
          {/* Section 1: How It Works */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                  // 01 The Process
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                  How It Works
                </h3>
              </div>
              <p className="text-xs text-[#17351F]/70 max-w-md">
                Claiming a spot takes less than 30 seconds. No complicated setups, no crypto wallets required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-6 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-sm bg-[#17351F] text-[#C8E87A] flex items-center justify-center font-mono font-black text-sm mb-4">
                    01
                  </div>
                  <h4 className="text-base font-black uppercase tracking-wider text-[#17351F] mb-2">
                    Pick a Spot
                  </h4>
                  <p className="text-xs text-[#17351F]/80 leading-relaxed">
                    Explore the 288-square digital board and select any available spot. Pick adjacent squares to build a larger presence.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#C9D7B5]/60 text-[10px] font-mono text-[#17351F]/60">
                  Fixed $1.00 starting price
                </div>
              </div>

              <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-6 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-sm bg-[#17351F] text-[#C8E87A] flex items-center justify-center font-mono font-black text-sm mb-4">
                    02
                  </div>
                  <h4 className="text-base font-black uppercase tracking-wider text-[#17351F] mb-2">
                    Make It Yours
                  </h4>
                  <p className="text-xs text-[#17351F]/80 leading-relaxed">
                    Provide your website or project link. We automatically detect your site's visual identity. Uploading a custom logo is completely optional.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#C9D7B5]/60 text-[10px] font-mono text-[#17351F]/60">
                  Auto-detection & live preview
                </div>
              </div>

              <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-6 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-sm bg-[#17351F] text-[#C8E87A] flex items-center justify-center font-mono font-black text-sm mb-4">
                    03
                  </div>
                  <h4 className="text-base font-black uppercase tracking-wider text-[#17351F] mb-2">
                    Own Your Spot
                  </h4>
                  <p className="text-xs text-[#17351F]/80 leading-relaxed">
                    Your spot is immediately activated and displayed to every visitor. You receive an official certificate of ownership.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#C9D7B5]/60 text-[10px] font-mono text-[#17351F]/60">
                  90-day duration + takeover dynamic
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: What Would You Put Here? */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                  // 02 Possibilities
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                  What Would You Put Here?
                </h3>
              </div>
              <p className="text-xs text-[#17351F]/70 max-w-md">
                A permanent corner of the internet for you, your projects, or your brand.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Globe, label: 'YOUR STARTUP', desc: 'Launch your product & drive curious adopters' },
                { icon: Briefcase, label: 'YOUR PORTFOLIO', desc: 'Showcase your engineering, design, or writing' },
                { icon: Laugh, label: 'YOUR MEME', desc: 'Immortalize internet culture permanently' },
                { icon: AtSign, label: 'YOUR USERNAME', desc: 'Stake your online handle on the board' },
                { icon: Palette, label: 'YOUR ART', desc: 'Display pixel art or illustrations' },
                { icon: Layers, label: 'YOUR SIDE PROJECT', desc: 'Share your open source tools & apps' },
                { icon: Flame, label: 'YOUR MANIFESTO', desc: 'Share your ideas with the digital world' },
                { icon: Sparkles, label: 'YOUR CORNER', desc: 'Personal blog, newsletter, or socials' },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={handleClaimClick}
                    className="group cursor-pointer bg-[#FAFDF5] hover:bg-[#17351F] border border-[#C9D7B5] hover:border-[#17351F] p-4 sm:p-5 rounded-sm transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-xs bg-white group-hover:bg-[#C8E87A] text-[#17351F] flex items-center justify-center mb-3 shadow-xs transition-colors">
                        <IconComponent size={16} />
                      </div>
                      <h4 className="text-xs sm:text-sm font-mono font-black text-[#17351F] group-hover:text-[#C8E87A] transition-colors uppercase tracking-wider mb-1">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-[#17351F]/70 group-hover:text-white/80 transition-colors leading-tight">
                        {item.desc}
                      </p>
                    </div>
                    <span className="mt-4 text-[9px] font-mono font-bold text-[#17351F]/40 group-hover:text-[#C8E87A] uppercase tracking-wider">
                      Claim for $1 →
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Scarcity & Real Activity */}
          <section className="bg-[#17351F] text-[#F5F8EC] rounded-sm p-6 sm:p-10 border border-[#17351F]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C8E87A]">
                  // 03 Real Scarcity
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-serif mt-1">
                  Only 288 Spots Will Ever Exist.
                </h3>
                <p className="text-xs sm:text-sm text-[#F5F8EC]/80 mt-2 leading-relaxed">
                  Unlike endless social feeds, TakeTheSpot is a scarce physical-style internet board. Every spot claimed permanently occupies space in the grid.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 font-mono">
                  <div>
                    <span className="text-[10px] text-white/50 uppercase block">Total Spots</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{totalSpots}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50 uppercase block">Claimed</span>
                    <span className="text-xl sm:text-2xl font-black text-[#C8E87A]">{claimedSpots}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/50 uppercase block">Remaining</span>
                    <span className="text-xl sm:text-2xl font-black text-white">{remainingSpots}</span>
                  </div>
                </div>

                <button
                  onClick={handleClaimClick}
                  className="mt-8 bg-[#C8E87A] text-[#17351F] hover:bg-[#b5d36e] active:scale-95 text-xs font-black uppercase tracking-[0.16em] px-6 py-3.5 rounded-sm transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Claim Your Spot for $1</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Real Activity Box */}
              <div className="bg-[#111511] border border-white/10 rounded-sm p-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <span className="text-xs font-mono font-bold text-[#C8E87A] uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live Activity
                  </span>
                  <span className="text-[10px] font-mono text-white/40">Verified Ledger</span>
                </div>

                {recentTransactions.length > 0 ? (
                  <div className="space-y-2.5">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="bg-white/5 border border-white/10 p-2.5 rounded-xs flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[#C8E87A] font-bold">{tx.newOwner || 'Anonymous'}</span>
                          <span className="text-white/60"> claimed </span>
                          <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded-xs">{tx.plotId}</span>
                        </div>
                        <span className="text-white/70 font-bold">{formatCurrency(tx.transactionAmount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-white/50 text-xs font-mono">
                    <p>Be the next to claim a spot on the board!</p>
                    <p className="text-[10px] text-white/30 mt-1">Activity updates in real-time as spots are claimed.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: FAQ */}
          <section id="faq">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                  // 04 Questions & Answers
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                  Frequently Asked Questions
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-[#C9D7B5] rounded-sm bg-[#FAFDF5] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#17351F] hover:bg-white transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        className={`text-[#17351F]/60 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-xs text-[#17351F]/80 leading-relaxed border-t border-[#C9D7B5]/40 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      {/* 7. FOOTER */}
      <footer className="w-full bg-[#17351F] text-[#F5F8EC]/80 border-t border-[#17351F] py-8 px-4 sm:px-8 text-xs font-mono z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white uppercase tracking-widest">TakeTheSpot.lol</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60 text-[10px]">© {new Date().getFullYear()} All spots permanent</span>
          </div>

          <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="hover:text-[#C8E87A] transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => setIsAdminPanelOpen(true)}
              className="hover:text-[#C8E87A] transition-colors"
            >
              Admin
            </button>
            <span className="text-[#C8E87A]">{remainingSpots} SPOTS LEFT</span>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111511] text-white px-5 py-2.5 rounded-sm shadow-2xl text-xs uppercase tracking-widest font-mono font-bold pointer-events-none border border-[#C8E87A]/40"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Loading Overlay */}
      {isConfirmingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111511]/70 backdrop-blur-sm p-6">
          <div className="bg-white border-2 border-[#17351F] px-8 py-6 text-center max-w-sm shadow-2xl rounded-sm">
            <div className="mx-auto mb-3 w-8 h-8 border-3 border-[#17351F]/20 border-t-[#17351F] rounded-full animate-spin" />
            <p className="text-sm font-black uppercase tracking-widest text-[#17351F]">
              Confirming Payment...
            </p>
            <p className="mt-2 text-xs text-[#17351F]/70 leading-relaxed">
              Verifying your charge with Dodo. Your spot will appear on the board momentarily!
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <Suspense fallback={null}>
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
            amount={selectedPlots
              .map((id) => plots.find((p) => p.id === id))
              .filter(Boolean)
              .reduce(
                (sum, plot) =>
                  sum +
                  (plot!.status === 'available'
                    ? plot!.currentPrice
                    : Math.round(plot!.currentPrice * config.takeoverMultiplier)),
                0
              )}
            plots={selectedPlots.map((id) => plots.find((p) => p.id === id)).filter(Boolean) as Plot[]}
            brandName={purchaseDetails.brandName}
            onPay={startDodoCheckout}
            onCancel={() => setIsPaymentModalOpen(false)}
          />
        )}

        <RulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
        />

        {isSuccessModalOpen && purchaseDetails && (
          <SuccessModal
            plots={selectedPlots.map((id) => plots.find((p) => p.id === id)).filter(Boolean) as Plot[]}
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
      </Suspense>
    </div>
  );
}
