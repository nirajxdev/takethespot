import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';

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

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white border border-[#C9D7B5] shadow-2xl p-4 flex items-center gap-6"
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#17351F]/50">
            {selectedIds.length === 1 ? '1 Plot' : `${selectedIds.length} Plots`}
          </span>
          <span className="text-base font-mono font-bold text-[#17351F]">
            {selectedIds.join(' · ')}
          </span>
        </div>

        <div className="w-px h-8 bg-[#C9D7B5]"></div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#17351F]/50">Total</span>
          <span className="text-base font-mono font-bold text-[#17351F]">{formatCurrency(totalCost)}</span>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <button 
            onClick={onClear}
            className="text-[10px] uppercase font-bold tracking-widest text-[#17351F]/50 hover:text-[#17351F] transition-colors"
          >
            Clear
          </button>
          <button 
            onClick={onCheckout}
            className="bg-[#C8E87A] text-[#17351F] px-6 py-3 text-xs font-black uppercase tracking-[0.1em] hover:bg-[#b5d36e] transition-colors shadow-sm whitespace-nowrap"
          >
            TAKE THE SPOT
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
