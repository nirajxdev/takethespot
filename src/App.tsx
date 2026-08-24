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
  TrendingUp,
  ShieldCheck,
  Award,
  Clock,
  ExternalLink,
} from 'lucide-react';

const PurchaseModal = lazy(() => import('./components/PurchaseModal.tsx'));
const TakeoverModal = lazy(() => import('./components/TakeoverModal.tsx'));
const PaymentModal = lazy(() => import('./components/PaymentModal.tsx'));
const SuccessModal = lazy(() => import('./components/SuccessModal.tsx'));
const ManageModal = lazy(() => import('./components/ManageModal.tsx'));
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
  manageToken?: string;
};

interface BoardStats {
  totalSpots: number;
  claimedSpots: number;
  availableSpots: number;
  totalVolume: number;
  acquisitionsCount: number;
  mostValuableSpots: { id: string; price: number; brandName?: string; takeoverPrice: number }[];
  mostContestedSpots: { id: string; takeoverCount: number; brandName?: string; price: number }[];
  recentBrands: { brandName: string; websiteUrl?: string; logo?: string; spotIds: string[] }[];
}

export default function App() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [config, setConfig] = useState<MarketConfig | null>(null);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [successManageToken, setSuccessManageToken] = useState<string | undefined>(undefined);
  const [highlightedPlotId, setHighlightedPlotId] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('sound_enabled') === 'true');
  const [purchaseDetails, setPurchaseDetails] = useState<{ brandName: string; logo: string; websiteUrl: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== 'true');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null);
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setBoardStats(data);
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
      showToast('Click or drag to select any spot(s) on the board.');
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    loadData().finally(() => {
      fetchTransactions();
      fetchStats();
      interval = setInterval(() => {
        loadData();
        fetchTransactions();
        fetchStats();
      }, 8000);
    });
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadData, fetchTransactions, fetchStats]);

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
        manageToken !== null ||
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
  }, [selectedPlots, isPurchaseModalOpen, isPaymentModalOpen, isSuccessModalOpen, isAdminPanelOpen, isRulesModalOpen, manageToken, focusedPlots]);

  // Query parameter deep link handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/\/$/, '');

    if (params.get('admin') === '1' || path === '/admin') {
      setIsAdminPanelOpen(true);
    }

    const tokenParam = params.get('manage');
    if (tokenParam) {
      setManageToken(tokenParam);
    }

    const spotParam = params.get('spot');
    if (spotParam) {
      setHighlightedPlotId(spotParam.toUpperCase());
    }

    if (params.get('paid') === '0') {
      showToast('Checkout was cancelled. No spots were claimed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Post-payment verification loop
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
            await fetchStats();
            if (isSoundEnabled) playSuccessChime();
            setIsConfirmingPayment(false);
            if (data.manageToken) {
              setSuccessManageToken(data.manageToken);
            }
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
            await fetchStats();
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
  }, [isSoundEnabled, loadData, fetchStats]);

  // Click on plot: if owned, open acquisition modal; if available, toggle in selection
  const handlePlotClick = (plot: Plot, mergedPlots?: Plot[]) => {
    if (plot.status === 'owned') {
      setFocusedPlots(mergedPlots && mergedPlots.length > 0 ? mergedPlots : [plot]);
      return;
    }

    const idsToToggle = mergedPlots && mergedPlots.length > 0
      ? mergedPlots.map((p) => p.id)
      : [plot.id];

    setSelectedPlots((prev) => {
      const allSelected = idsToToggle.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !idsToToggle.includes(id));
      } else {
        return Array.from(new Set([...prev, ...idsToToggle]));
      }
    });
  };

  // Batch selection for drag marquee or quick presets
  const handleSelectBatch = (plotIds: string[]) => {
    setSelectedPlots(plotIds);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedPlots([]);
  };

  const handleTakeover = (plotsToTake: Plot[]) => {
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
      manageToken: data.manageToken,
    };
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
    window.location.href = data.checkoutUrl;
  };

  const claimedSpots = plots.filter((p) => p.status === 'owned').length;
  const totalSpots = config?.totalRows ? config.totalRows * config.totalColumns : 288;
  const remainingSpots = Math.max(0, totalSpots - claimedSpots);
  const percentageClaimed = Math.round((claimedSpots / totalSpots) * 100);

  const selectedPlotsObjects = selectedPlots
    .map((id) => plots.find((p) => p.id === id))
    .filter(Boolean) as Plot[];

  const selectedAvailableCount = selectedPlotsObjects.filter((p) => p.status === 'available').length;
  const selectedTakeoverCount = selectedPlotsObjects.filter((p) => p.status === 'owned').length;
  const estimatedSelectionTotal = selectedPlotsObjects.reduce((sum, p) => {
    if (p.status === 'available') {
      return sum + p.currentPrice;
    }
    return sum + Math.round(p.currentPrice * (config?.takeoverMultiplier || 2.5));
  }, 0);

  const hasRealActivity = (boardStats?.totalVolume || 0) > 0 || claimedSpots > 0;
  const hasRecentBrands = Boolean(boardStats?.recentBrands && boardStats.recentBrands.length > 0);
  const hasValuableSpots = Boolean(boardStats?.mostValuableSpots && boardStats.mostValuableSpots.length > 0);
  const hasContestedSpots = Boolean(
    boardStats?.mostContestedSpots &&
      boardStats.mostContestedSpots.length > 0 &&
      boardStats.mostContestedSpots.some((s) => s.takeoverCount > 0),
  );

  useEffect(() => {
    if (!config || !plots.length) return;
    const initialPriceFormatted = `$${(config.initialPrice / 100).toFixed(2)}`;
    const dynamicTitle = `Take The Spot | ${claimedSpots} / ${totalSpots} Spots Taken`;
    const dynamicDesc = `Claim space on a 288-cell public digital billboard starting from ${initialPriceFormatted}. 90-day active placements with competitive acquisitions.`;

    document.title = dynamicTitle;

    const updateMeta = (selector: string, content: string) => {
      const tag = document.querySelector(selector);
      if (tag) tag.setAttribute('content', content);
    };

    updateMeta('meta[name="description"]', dynamicDesc);
    updateMeta('meta[property="og:title"]', dynamicTitle);
    updateMeta('meta[property="og:description"]', dynamicDesc);
    updateMeta('meta[property="og:image"]', 'https://takethespot.lol/og.png');
    updateMeta('meta[name="twitter:title"]', dynamicTitle);
    updateMeta('meta[name="twitter:description"]', dynamicDesc);
    updateMeta('meta[name="twitter:image"]', 'https://takethespot.lol/og.png');
  }, [claimedSpots, totalSpots, config]);

  const faqs = [
    {
      q: "What is TakeTheSpot.lol?",
      a: "TakeTheSpot is a competitive public digital billboard with exactly 288 cells. Anyone can purchase 1 cell, multiple cells, large rectangular sections, or even the entire board to showcase their project, startup, portfolio, art, or online presence.",
    },
    {
      q: "How much does a spot cost?",
      a: "Available empty cells cost $1.00 USD each. Occupied cells can be acquired at 2.5× their current listed value. There are no limits on how many cells you can buy at once.",
    },
    {
      q: "How long does ownership last?",
      a: "Every purchase grants guaranteed 90-day active placement from the confirmed payment timestamp. If not taken over by someone else, expired cells return to available at $1.00.",
    },
    {
      q: "Can someone acquire part of my merged block?",
      a: "Yes! Every single cell is an independent source of truth. If another buyer acquires 1 cell from your 16-cell block, you retain the remaining 15 cells, and the visual display dynamically recalculates your remaining tiles instantly.",
    },
    {
      q: "How do I edit my spot's logo or link later?",
      a: "After payment, you receive a private secret management link (e.g. ?manage=TOKEN). You can bookmark this URL to update your brand name, destination link, or logo image at any time during your 90-day active period.",
    },
    {
      q: "How does payment work?",
      a: "Payments are processed securely via Dodo Payments supporting credit cards, debit cards, Apple Pay, Google Pay, UPI, and international payment methods. Spots are activated immediately upon verified webhook confirmation.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-tactile text-[#111511] font-sans selection:bg-[#C8E87A] flex flex-col">
      <Analytics />

      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 w-full h-13 sm:h-14 bg-white/95 backdrop-blur-md border-b border-[#C9D7B5] flex items-center justify-between px-3 sm:px-8 shrink-0 z-40 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="TakeTheSpot Logo"
              className="h-7 sm:h-8 w-auto rounded-sm border border-[#17351F]/10 group-hover:scale-105 transition-transform"
            />
            <span className="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-[#17351F] font-serif leading-none">
              Take The Spot
            </span>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#17351F] hover:text-[#2a5a35] hover:bg-[#F5F8EC] px-2 py-1 rounded-sm transition-colors border border-transparent hover:border-[#C9D7B5] cursor-pointer"
          >
            Rules
          </button>

          {hasRealActivity && (
            <a
              href="#stats"
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#17351F]/70 hover:text-[#17351F] px-2 py-1 rounded-sm transition-colors hidden sm:block"
            >
              Stats
            </a>
          )}

          <a
            href="#faq"
            className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#17351F]/70 hover:text-[#17351F] px-2 py-1 rounded-sm transition-colors hidden sm:block"
          >
            FAQ
          </a>

          <button
            onClick={handleClaimClick}
            className="bg-[#C8E87A] text-[#17351F] hover:bg-[#b5d36e] active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-[0.12em] px-3 sm:px-4 py-1.5 rounded-sm transition-all shadow-sm flex items-center gap-1 border border-[#17351F] cursor-pointer"
          >
            <span>Claim Space</span>
            <ArrowRight size={12} className="shrink-0" />
          </button>
        </div>
      </header>

      {/* Persistence Warning Banner */}
      {persistenceWarning && (
        <div className="w-full bg-[#111511] text-[#C8E87A] text-[9px] sm:text-xs uppercase tracking-wider text-center py-1.5 sm:py-2 px-3 sm:px-4 shadow-sm border-b border-[#C8E87A]/20">
          {persistenceWarning}
        </div>
      )}

      {/* HERO & BOARD VIEWPORT CONTAINER */}
      <div className="flex flex-col justify-start md:justify-between md:min-h-[calc(100dvh-3.75rem)]">
        {/* 2. MINIMAL HERO */}
        <section className="w-full max-w-[96vw] xl:max-w-[1360px] 2xl:max-w-[1440px] mx-auto px-2 sm:px-4 pt-3 sm:pt-4 pb-1 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 pb-2.5 border-b border-[#C9D7B5]/60">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-[#17351F] font-serif leading-none">
                Take Your Spot.
              </h1>
              <p className="text-xs sm:text-sm text-[#17351F]/80 mt-1 font-medium">
                Claim space on a public digital billboard. Starts at $1 · Active for 90 days.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClaimClick}
                className="bg-[#17351F] text-[#C8E87A] hover:bg-[#234e2e] active:scale-95 text-xs font-black uppercase tracking-[0.14em] px-4 py-2 rounded-sm transition-all shadow-sm flex items-center gap-1.5 border border-[#17351F] cursor-pointer"
              >
                <span>Claim Space</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* 3. CONTEXTUAL AVAILABILITY & ACTIVE SELECTION BAR */}
          {selectedPlots.length === 0 ? (
            /* DEFAULT STATE: Minimal Live Availability Status */
            <div className="mt-2 mb-1 flex items-center justify-between text-xs font-mono text-[#17351F] px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-bold text-[11px] sm:text-xs">
                  {claimedSpots} / {totalSpots} spots claimed · {remainingSpots} available
                </span>
              </div>
              <span className="text-[10px] text-[#17351F]/60 hidden sm:inline">
                Click or drag to select cells
              </span>
            </div>
          ) : (
            /* ACTIVE SELECTION STATE: Contextual Summary & Actions */
            <div className="mt-2 mb-1 bg-[#17351F] text-[#F5F8EC] border border-[#C8E87A]/60 px-3 py-2 rounded-sm flex flex-wrap items-center justify-between gap-2 shadow-md font-mono">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="font-black text-[#C8E87A] uppercase tracking-wide">
                  {selectedPlots.length} {selectedPlots.length === 1 ? 'spot' : 'spots'} selected
                </span>
                <span className="text-white/30 hidden sm:inline">·</span>
                <span className="text-white/80 text-[11px]">
                  {selectedAvailableCount > 0 && `${selectedAvailableCount} available`}
                  {selectedAvailableCount > 0 && selectedTakeoverCount > 0 && ' · '}
                  {selectedTakeoverCount > 0 && `${selectedTakeoverCount} takeover${selectedTakeoverCount === 1 ? '' : 's'}`}
                </span>
                <span className="text-white/30 hidden sm:inline">·</span>
                <span className="font-bold text-[#C8E87A]">
                  Estimated total: {formatCurrency(estimatedSelectionTotal)}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(true)}
                  className="bg-[#C8E87A] text-[#17351F] hover:bg-[#b5d36e] active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xs transition-all shadow-sm flex items-center gap-1 border border-[#17351F] cursor-pointer"
                >
                  <span>Claim {selectedPlots.length} {selectedPlots.length === 1 ? 'Spot' : 'Spots'}</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. MAIN INTERACTIVE BOARD */}
        <main ref={gridRef} className="w-full flex-1 flex flex-col items-center justify-center py-0.5 sm:py-1 md:my-auto">
          <Grid
            plots={plots}
            selectedPlots={selectedPlots}
            onPlotClick={handlePlotClick}
            onSelectBatch={handleSelectBatch}
            onClearSelection={handleClearSelection}
            highlightedPlotId={highlightedPlotId}
            config={
              config || {
                totalRows: 12,
                totalColumns: 24,
                initialPrice: 100,
                maxPlotsPerUser: 288,
                ownershipDurationDays: 90,
                takeoverMultiplier: 2.5,
              }
            }
            isLoading={isLoading && plots.length === 0}
          />

          {!isLoading && (loadError || plots.length === 0) && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#C9D7B5]/90 p-4 sm:p-6">
              <div className="max-w-md bg-[#F5F8EC] border-2 border-[#17351F] p-4 sm:p-6 text-center shadow-xl">
                <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#17351F] mb-2">
                  {loadError ? 'Could not load the grid' : 'No plots to display'}
                </p>
                <p className="text-[11px] sm:text-xs text-[#17351F]/70 mb-4 leading-relaxed">
                  {loadError || 'The API returned an empty board.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    loadData();
                  }}
                  className="px-5 sm:px-6 py-2 bg-[#17351F] text-[#F5F8EC] text-[10px] font-bold uppercase tracking-widest hover:bg-[#2a5a35] cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Subtle Bottom Scroll Cue */}
        <div className="w-full text-center pb-1.5 select-none opacity-40 hover:opacity-90 transition-opacity shrink-0">
          <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#17351F]">
            Scroll for details ↓
          </span>
        </div>
      </div>

      {/* 5. FLOATING SELECTION PANEL (FOR SCROLLED VIEWPORTS) */}
      <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
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

          {/* Section: Live Board Statistics & Leaderboard (Rendered ONLY when real data exists) */}
          {hasRealActivity && (
            <section id="stats">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                    // Live Intelligence
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                    Market Statistics
                  </h3>
                </div>
                <p className="text-xs text-[#17351F]/70 max-w-md">
                  Authoritative transaction ledger metrics and active billboard valuations.
                </p>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-4 rounded-sm">
                  <span className="text-[9px] font-mono font-bold text-[#17351F]/60 uppercase tracking-widest block">
                    TOTAL PLACEMENTS
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#17351F] mt-1 block">
                    {claimedSpots} / {totalSpots}
                  </span>
                  <span className="text-[10px] text-[#17351F]/70 font-mono mt-0.5 block">
                    {remainingSpots} available for $1
                  </span>
                </div>

                <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-4 rounded-sm">
                  <span className="text-[9px] font-mono font-bold text-[#17351F]/60 uppercase tracking-widest block">
                    TRANSACTION VOLUME
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#17351F] mt-1 block">
                    {formatCurrency(boardStats?.totalVolume || 0)}
                  </span>
                  <span className="text-[10px] text-[#17351F]/70 font-mono mt-0.5 block">
                    Processed via Dodo
                  </span>
                </div>

                <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-4 rounded-sm">
                  <span className="text-[9px] font-mono font-bold text-[#17351F]/60 uppercase tracking-widest block">
                    COMPETITIVE TAKEOVERS
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-[#D97706] mt-1 block">
                    {boardStats?.acquisitionsCount || 0}
                  </span>
                  <span className="text-[10px] text-[#17351F]/70 font-mono mt-0.5 block">
                    Acquired at 2.5× valuation
                  </span>
                </div>

                <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-4 rounded-sm">
                  <span className="text-[9px] font-mono font-bold text-[#17351F]/60 uppercase tracking-widest block">
                    ACTIVE GUARANTEE
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-800 mt-1 block">
                    90 Days
                  </span>
                  <span className="text-[10px] text-[#17351F]/70 font-mono mt-0.5 block">
                    Per confirmed claim
                  </span>
                </div>
              </div>

              {/* Leaderboard Lists: Condition-based rendering without empty placeholders */}
              {(hasValuableSpots || hasContestedSpots) && (
                <div className={`grid grid-cols-1 ${hasValuableSpots && hasContestedSpots ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl'} gap-6`}>
                  {/* Most Valuable Spots (Only when real occupied spots exist) */}
                  {hasValuableSpots && (
                    <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-5 rounded-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-[#C9D7B5] mb-3">
                        <div className="flex items-center gap-1.5">
                          <Award size={15} className="text-[#17351F]" />
                          <h4 className="text-xs font-mono font-black uppercase tracking-wider text-[#17351F]">
                            Most Valuable Spots
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono text-[#17351F]/60">Ranked by valuation</span>
                      </div>

                      <div className="space-y-2">
                        {boardStats!.mostValuableSpots.slice(0, 5).map((spot, idx) => (
                          <div
                            key={spot.id}
                            onClick={() => {
                              const p = plots.find((item) => item.id === spot.id);
                              if (p) handlePlotClick(p);
                            }}
                            className="p-2 bg-white border border-[#C9D7B5] rounded-xs flex items-center justify-between hover:bg-[#F5F8EC] transition-colors cursor-pointer text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#17351F]/40 text-[10px]">#{idx + 1}</span>
                              <span className="bg-[#17351F] text-[#C8E87A] px-1.5 py-0.5 rounded-xs font-black text-[10px]">
                                {spot.id}
                              </span>
                              <span className="font-bold text-[#17351F] truncate max-w-[140px]">
                                {spot.brandName || 'Claimed Spot'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-[#17351F] block">{formatCurrency(spot.price)}</span>
                              <span className="text-[8px] text-[#D97706] block">
                                Takeover: {formatCurrency(spot.takeoverPrice)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Most Contested Spots (Only when real takeovers exist) */}
                  {hasContestedSpots && (
                    <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-5 rounded-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-[#C9D7B5] mb-3">
                        <div className="flex items-center gap-1.5">
                          <Flame size={15} className="text-[#D97706]" />
                          <h4 className="text-xs font-mono font-black uppercase tracking-wider text-[#17351F]">
                            Most Contested Real Estate
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono text-[#17351F]/60">Ranked by takeovers</span>
                      </div>

                      <div className="space-y-2">
                        {boardStats!.mostContestedSpots.slice(0, 5).map((spot, idx) => (
                          <div
                            key={spot.id}
                            onClick={() => {
                              const p = plots.find((item) => item.id === spot.id);
                              if (p) handlePlotClick(p);
                            }}
                            className="p-2 bg-white border border-[#C9D7B5] rounded-xs flex items-center justify-between hover:bg-[#F5F8EC] transition-colors cursor-pointer text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#17351F]/40 text-[10px]">#{idx + 1}</span>
                              <span className="bg-[#17351F] text-[#C8E87A] px-1.5 py-0.5 rounded-xs font-black text-[10px]">
                                {spot.id}
                              </span>
                              <span className="font-bold text-[#17351F] truncate max-w-[140px]">
                                {spot.brandName || 'Claimed Spot'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-[#D97706] block">
                                {spot.takeoverCount} takeover{spot.takeoverCount === 1 ? '' : 's'}
                              </span>
                              <span className="text-[8px] text-[#17351F]/60 block">{formatCurrency(spot.price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Section: Recently Claimed / Active Brands Showcase (Only when real brands exist) */}
          {hasRecentBrands && (
            <section id="discover">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6 pb-4 border-b border-[#C9D7B5]">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                    // Active Placements
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                    Recently Claimed Brands
                  </h3>
                </div>
                <p className="text-xs text-[#17351F]/70 max-w-md">
                  Websites and creators currently staking their presence on TakeTheSpot.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {boardStats!.recentBrands.slice(0, 12).map((brand, idx) => (
                  <div
                    key={idx}
                    className="bg-[#FAFDF5] border border-[#C9D7B5] p-3 rounded-sm flex flex-col justify-between hover:border-[#17351F] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.brandName}
                          className="w-7 h-7 object-contain rounded-xs bg-white border border-[#C9D7B5] p-0.5 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-xs bg-[#17351F] text-[#C8E87A] flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          {brand.brandName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-[#17351F] truncate" title={brand.brandName}>
                        {brand.brandName}
                      </span>
                    </div>

                    <div className="text-[9px] font-mono text-[#17351F]/70 mb-2 truncate">
                      Spots: {brand.spotIds.slice(0, 3).join(', ')}
                      {brand.spotIds.length > 3 ? ` +${brand.spotIds.length - 3}` : ''}
                    </div>

                    {brand.websiteUrl ? (
                      <a
                        href={brand.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-mono font-bold text-[#17351F] hover:text-[#2a5a35] inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Visit Site</span>
                        <ExternalLink size={9} />
                      </a>
                    ) : (
                      <span className="text-[9px] font-mono text-[#17351F]/40">No link</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Founder's Note / Why This Exists */}
          <section className="bg-[#FAFDF5] border-2 border-[#17351F] p-6 sm:p-10 rounded-sm">
            <div className="max-w-3xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                // The Vision
              </span>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif mt-1 mb-4">
                Why TakeTheSpot Exists
              </h3>
              <div className="text-xs sm:text-sm text-[#17351F]/80 space-y-3 leading-relaxed font-serif">
                <p>
                  The modern internet has turned into infinite algorithmic feeds where content disappears within 48 hours.
                  We missed the golden era of the web where internet artifacts had physical-style permanence and real scarcity.
                </p>
                <p>
                  <strong>TakeTheSpot</strong> is a living 288-cell digital billboard. There are no algorithmic recommendations,
                  no endless scrolling, and no shadowbans. When you claim a spot, you get a tangible coordinate on a global canvas
                  viewed by creators, founders, hackers, and collectors.
                </p>
                <p>
                  With guaranteed 90-day durations and dynamic 2.5× acquisition mechanics, the billboard stays competitive,
                  fair, and constantly evolving.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#C9D7B5] flex items-center justify-between font-mono text-xs">
                <span className="text-[#17351F] font-bold">Created by Niraj · @nirajxdev</span>
                <a
                  href="https://x.com/nirajxdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#17351F] hover:underline font-bold inline-flex items-center gap-1"
                >
                  Follow on X →
                </a>
              </div>
            </div>
          </section>

          {/* Section: Possibilities */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                  // Possibilities
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17351F] font-serif">
                  What Would You Put Here?
                </h3>
              </div>
              <p className="text-xs text-[#17351F]/70 max-w-md">
                A public corner of the internet for you, your projects, or your brand.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Globe, label: 'YOUR STARTUP', desc: 'Launch your product & drive curious adopters' },
                { icon: Briefcase, label: 'YOUR PORTFOLIO', desc: 'Showcase your engineering, design, or writing' },
                { icon: Laugh, label: 'YOUR MEME', desc: 'Immortalize internet culture on the billboard' },
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

          {/* Section: FAQ */}
          <section id="faq">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8 pb-4 border-b border-[#C9D7B5]">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17351F]/60">
                  // Questions & Answers
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
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#17351F] hover:bg-white transition-colors cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
            <span className="font-bold text-white uppercase tracking-widest">TakeTheSpot.lol</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60 text-[10px]">Built by</span>
            <a
              href="https://x.com/nirajxdev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C8E87A] hover:underline font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@nirajxdev</span>
            </a>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-white/60 text-[10px] hidden sm:inline">90-Day Guaranteed Placements</span>
          </div>

          <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="hover:text-[#C8E87A] transition-colors cursor-pointer"
            >
              Rules
            </button>
            <button
              type="button"
              onClick={() => setIsAdminPanelOpen(true)}
              className="hover:text-[#C8E87A] transition-colors cursor-pointer"
            >
              Admin
            </button>
            <span className="text-[#C8E87A]">{remainingSpots} SPOTS AVAILABLE</span>
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
        {manageToken && (
          <ManageModal
            token={manageToken}
            onClose={() => setManageToken(null)}
            onUpdated={() => {
              loadData();
              fetchStats();
            }}
          />
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
            manageToken={successManageToken}
            onClose={() => {
              setIsSuccessModalOpen(false);
              setSelectedPlots([]);
              setPurchaseDetails(null);
              setSuccessManageToken(undefined);
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
