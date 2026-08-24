import { useEffect, useState } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency, getDaysLeft } from '../utils.ts';
import { motion } from 'motion/react';
import { X, ExternalLink, Flame, Clock, Share2, Check } from 'lucide-react';

interface TakeoverModalProps {
  plots: Plot[];
  config: MarketConfig;
  onClose: () => void;
  onAcquire: () => void;
}

export default function TakeoverModal({ plots, config, onClose, onAcquire }: TakeoverModalProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [copied, setCopied] = useState(false);

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

  const handleShareSpot = () => {
    const url = `${window.location.origin}/?spot=${encodeURIComponent(primaryPlot.id)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-sm shadow-xl relative border border-[#C9D7B5] my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="p-5 sm:p-7 flex flex-col items-center text-center">
          {primaryPlot.logo ? (
            <div className="w-20 h-20 rounded-sm border border-[#C9D7B5] p-2 shadow-sm mb-3 bg-[#F5F8EC] flex items-center justify-center">
              <img src={primaryPlot.logo} alt={primaryPlot.brandName || "Logo"} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-sm bg-[#F5F8EC] border border-[#C9D7B5] mb-3 flex items-center justify-center text-[#17351F]/40 font-mono font-black text-xl">
              {primaryPlot.id}
            </div>
          )}

          <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#D97706] uppercase tracking-widest mb-1">
            <Flame size={12} />
            <span>OCCUPIED SPOT · ACQUIRABLE</span>
          </div>

          <h3 className="text-2xl font-black text-[#17351F] mb-2 uppercase tracking-wide font-serif">
            {primaryPlot.brandName || 'Claimed Spot'}
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {primaryPlot.websiteUrl && (
              <a
                href={primaryPlot.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-xs border border-[#C9D7B5] text-[#17351F] text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-[#F5F8EC] transition-colors inline-flex items-center gap-1"
              >
                <span>Visit Website</span>
                <ExternalLink size={10} />
              </a>
            )}

            <button
              type="button"
              onClick={handleShareSpot}
              className="px-3 py-1 rounded-xs border border-[#C9D7B5] text-[#17351F] text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-[#F5F8EC] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check size={10} className="text-emerald-600" /> : <Share2 size={10} />}
              <span>{copied ? 'Link Copied!' : 'Share Spot'}</span>
            </button>
          </div>

          <div className="w-full bg-[#FAFDF5] p-4 border-y border-[#C9D7B5] text-left font-mono space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#17351F]/60 font-bold uppercase text-[9px]">Spot ID(s)</span>
              <span className="font-bold text-[#17351F]">{plots.map((p) => p.id).join(' · ')}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#17351F]/60 font-bold uppercase text-[9px]">Current Listed Price</span>
              <span className="font-bold text-[#17351F]">{formatCurrency(currentPrice)}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#17351F]/60 font-bold uppercase text-[9px]">Expires In</span>
              <span className="font-bold text-[#17351F] flex items-center gap-1">
                <Clock size={11} className="text-[#17351F]/50" />
                {timeLeft}
              </span>
            </div>

            <div className="pt-2 border-t border-[#C9D7B5]/60 flex justify-between items-baseline">
              <div>
                <span className="text-[9px] text-[#17351F]/60 uppercase tracking-widest font-bold block">
                  Acquire For 2.5×
                </span>
                <span className="text-[8px] text-[#17351F]/50 block">
                  New 90-day ownership period
                </span>
              </div>
              <span className="text-xl font-mono font-black text-[#17351F]">{formatCurrency(takeoverPrice)}</span>
            </div>
          </div>

          <div className="w-full mt-4">
            <button
              onClick={onAcquire}
              className="w-full bg-[#C8E87A] text-[#17351F] py-3 text-xs font-black uppercase tracking-[0.16em] rounded-sm hover:bg-[#b5d36e] active:scale-95 transition-all shadow-sm border border-[#17351F] cursor-pointer"
            >
              ACQUIRE {plots.length > 1 ? `${plots.length} SPOTS` : 'THIS SPOT'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
