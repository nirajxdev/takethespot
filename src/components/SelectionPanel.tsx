import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, Sparkles } from 'lucide-react';

interface SelectionPanelProps {
  selectedIds: string[];
  plots: Plot[];
  onClear: () => void;
  onCheckout: () => void;
  config: MarketConfig;
}

export default function SelectionPanel({
  selectedIds,
  plots,
  onClear,
  onCheckout,
  config,
}: SelectionPanelProps) {
  const selectedPlots = selectedIds
    .map((id) => plots.find((p) => p.id === id))
    .filter(Boolean) as Plot[];

  const availableCount = selectedPlots.filter((p) => p.status === 'available').length;
  const takeoverCount = selectedPlots.filter((p) => p.status === 'owned').length;

  const totalCost = selectedPlots.reduce((sum, plot) => {
    if (plot.status === 'available') {
      return sum + plot.currentPrice;
    } else {
      return sum + Math.round(plot.currentPrice * config.takeoverMultiplier);
    }
  }, 0);

  const isAll288 = selectedIds.length >= 288;
  const ctaLabel = isAll288
    ? 'TAKE THE BOARD'
    : takeoverCount > 0 && availableCount === 0
    ? `ACQUIRE ${selectedIds.length === 1 ? 'SPOT' : 'SPOTS'}`
    : selectedIds.length === 1
    ? 'CLAIM SPOT'
    : 'CLAIM SPOTS';

  const displayIds =
    selectedIds.length <= 4
      ? selectedIds.join(' · ')
      : `${selectedIds.slice(0, 3).join(' · ')} +${selectedIds.length - 3} more`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-[#17351F] text-[#F5F8EC] border-2 border-[#C8E87A] shadow-[0_16px_48px_rgba(0,0,0,0.45)] rounded-sm p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-5 max-w-2xl w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)]"
      >
        <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden min-w-0">
          {/* Selected spots count & IDs */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase text-[#C8E87A]">
                {selectedIds.length} {selectedIds.length === 1 ? 'SPOT' : 'SPOTS'}
              </span>
              {takeoverCount > 0 && (
                <span className="bg-[#D97706] text-white text-[7px] font-mono font-bold px-1 rounded-xs uppercase">
                  {takeoverCount} takeover{takeoverCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-sm font-mono font-black text-white truncate tracking-wide">
              {displayIds}
            </span>
          </div>

          <div className="w-px h-7 sm:h-8 bg-white/20 shrink-0" />

          {/* Total Cost */}
          <div className="flex flex-col shrink-0">
            <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase text-white/60">
              TOTAL ESTIMATE
            </span>
            <span className="text-xs sm:text-base font-mono font-black text-[#C8E87A] leading-none mt-0.5">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={onClear}
            className="text-[9px] sm:text-[10px] uppercase font-mono font-bold tracking-wider text-white/60 hover:text-white transition-colors p-1.5 sm:px-2 sm:py-1.5 flex items-center gap-1 cursor-pointer"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X size={13} />
            <span className="hidden md:inline">CLEAR</span>
          </button>
          <button
            onClick={onCheckout}
            className="bg-[#C8E87A] text-[#17351F] px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.14em] hover:bg-[#b5d36e] active:scale-95 transition-all shadow-md rounded-xs whitespace-nowrap flex items-center gap-1 sm:gap-1.5 border border-[#17351F] cursor-pointer"
          >
            {isAll288 && <Sparkles size={12} className="shrink-0" />}
            <span>{ctaLabel}</span>
            <ArrowRight size={12} className="shrink-0" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

