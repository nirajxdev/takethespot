import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';

interface SelectionPanelProps {
  selectedIds: string[];
  plots: Plot[];
  onClear: () => void;
  onCheckout: () => void;
  config: MarketConfig;
}

export default function SelectionPanel({ selectedIds, plots, onClear, onCheckout, config }: SelectionPanelProps) {
  const selectedPlots = selectedIds.map(id => plots.find(p => p.id === id)).filter(Boolean) as Plot[];
  
  const totalCost = selectedPlots.reduce((sum, plot) => {
    if (plot.status === 'available') {
      return sum + plot.currentPrice;
    } else {
      return sum + Math.round(plot.currentPrice * config.takeoverMultiplier);
    }
  }, 0);

  const ctaLabel = selectedIds.length === 1 ? 'CLAIM THIS SPOT' : 'CLAIM THESE SPOTS';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-[#17351F] text-[#F5F8EC] border-2 border-[#C8E87A] shadow-[0_16px_48px_rgba(0,0,0,0.4)] rounded-sm p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:gap-6 max-w-xl w-[calc(100vw-2rem)]"
      >
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden min-w-0">
          {/* Selected spots count & IDs */}
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-[#C8E87A]">
              SELECTED ({selectedIds.length} {selectedIds.length === 1 ? 'SPOT' : 'SPOTS'})
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-white truncate tracking-wide">
              {selectedIds.join(' · ')}
            </span>
          </div>

          <div className="w-px h-8 bg-white/20 shrink-0" />

          {/* Total Cost */}
          <div className="flex flex-col shrink-0">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-white/60">TOTAL</span>
            <span className="text-sm sm:text-base font-mono font-black text-[#C8E87A] leading-none mt-0.5">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button 
            onClick={onClear}
            className="text-[10px] uppercase font-mono font-bold tracking-wider text-white/60 hover:text-white transition-colors px-2 py-1.5 flex items-center gap-1"
            title="Clear selection"
          >
            <X size={12} />
            <span className="hidden sm:inline">CLEAR</span>
          </button>
          <button 
            onClick={onCheckout}
            className="bg-[#C8E87A] text-[#17351F] px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-black uppercase tracking-[0.14em] hover:bg-[#b5d36e] active:scale-95 transition-all shadow-md rounded-xs whitespace-nowrap flex items-center gap-1.5 border border-[#17351F] cursor-pointer"
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

