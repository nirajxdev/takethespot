import { useEffect, useState } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency } from '../utils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface TakeoverModalProps {
  plots: Plot[];
  config: MarketConfig;
  onClose: () => void;
  onAcquire: () => void;
}

export default function TakeoverModal({ plots, config, onClose, onAcquire }: TakeoverModalProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const primaryPlot = plots[0];
  const currentPrice = plots.reduce((sum, p) => sum + p.currentPrice, 0);
  const takeoverPrice = plots.reduce((sum, p) => sum + Math.round(p.currentPrice * config.takeoverMultiplier), 0);

  useEffect(() => {
    if (!primaryPlot.expiresAt) return;
    
    const targetDate = new Date(primaryPlot.expiresAt).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [primaryPlot.expiresAt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111511]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-sm shadow-xl overflow-hidden relative border border-[#C9D7B5]"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          {primaryPlot.logo ? (
            <div className="w-20 h-20 rounded-sm border border-[#C9D7B5] p-2 shadow-sm mb-4 bg-[#F5F8EC] flex items-center justify-center">
              <img src={primaryPlot.logo} alt={primaryPlot.brandName || "Logo"} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-sm bg-[#F5F8EC] border border-[#C9D7B5] mb-4 flex items-center justify-center text-[#17351F]/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
              </svg>
            </div>
          )}

          <h3 className="text-3xl font-black text-[#17351F] mb-3 uppercase tracking-widest font-serif">{primaryPlot.brandName}</h3>
          
          {primaryPlot.websiteUrl && (
            <a 
              href={primaryPlot.websiteUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-5 py-2 mt-2 rounded-sm border border-[#C9D7B5] text-[#17351F]/70 text-xs font-bold uppercase tracking-widest hover:bg-[#F5F8EC] hover:text-[#17351F] transition-colors inline-flex items-center space-x-2 mb-6"
            >
              <span>Visit Website</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          )}

          <div className="w-full bg-[#F5F8EC] p-5 border-y border-[#C9D7B5]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-[#17351F]/50 font-bold uppercase tracking-wider">Current Value</span>
              <span className="text-sm font-mono font-bold text-[#17351F]">{formatCurrency(currentPrice)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-[#17351F]/50 font-bold uppercase tracking-wider">Expires In</span>
              <span className="text-xs font-mono font-bold text-[#17351F]">
                {timeLeft}
              </span>
            </div>

            <div className="flex flex-col mt-4 pt-4 border-t border-[#C9D7B5]/50">
              <span className="text-[10px] text-[#17351F]/50 uppercase tracking-widest font-bold mb-1">Acquire {plots.length > 1 ? 'these spots' : 'this spot'} for:</span>
              <span className="text-2xl font-mono font-bold text-[#17351F]">{formatCurrency(takeoverPrice)}</span>
            </div>
          </div>
          
          <div className="w-full mt-6">
            <button
              onClick={onAcquire}
              className="w-full bg-[#C8E87A] text-[#17351F] py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#b5d36e] transition-colors shadow-sm"
            >
              ACQUIRE {plots.length > 1 ? 'SPOTS' : 'SPOT'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
