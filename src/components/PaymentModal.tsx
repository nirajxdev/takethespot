import React, { useState } from 'react';
import { Plot } from '../types.ts';
import { formatCurrency, cn } from '../utils.ts';
import { motion } from 'motion/react';

interface PaymentModalProps {
  amount: number;
  plots: Plot[];
  brandName?: string;
  onPay: () => Promise<void>;
  onCancel: () => void;
}

export default function PaymentModal({ amount, plots, brandName, onPay, onCancel }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    setIsProcessing(true);
    try {
      await onPay();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not start checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-sm shadow-xl relative border border-[#C9D7B5] p-5 sm:p-8 flex flex-col my-auto"
      >
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-3 right-3 text-[#17351F]/40 hover:text-[#17351F] transition-colors p-1 disabled:opacity-50 z-10 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="flex flex-col mb-4">
          <h3 className="text-xl font-black text-[#17351F] uppercase tracking-widest font-serif mb-1">Your order</h3>
          <p className="text-[10px] text-[#17351F]/60 uppercase tracking-widest font-bold">
            {plots.length} spot{plots.length === 1 ? '' : 's'} · paid on Dodo
          </p>
        </div>

        <div className="border border-[#C9D7B5] rounded-sm divide-y divide-[#C9D7B5] mb-4">
          {brandName && (
            <div className="px-4 py-3 flex justify-between items-center gap-3">
              <span className="text-[10px] text-[#17351F]/50 font-bold uppercase tracking-wider">Brand</span>
              <span className="text-sm font-bold text-[#17351F] truncate">{brandName}</span>
            </div>
          )}
          <div className="px-4 py-3 flex justify-between items-start gap-3">
            <span className="text-[10px] text-[#17351F]/50 font-bold uppercase tracking-wider shrink-0">Plots</span>
            <span className="text-sm font-mono font-bold text-[#17351F] text-right">{plots.map(p => p.id).join(' · ')}</span>
          </div>
          <div className="px-4 py-3 bg-[#F5F8EC] flex justify-between items-center">
            <span className="text-xs text-[#17351F] font-bold uppercase tracking-wider">Total due</span>
            <span className="text-xl font-mono font-black text-[#17351F]">{formatCurrency(amount)}</span>
          </div>
        </div>

        <p className="text-[11px] text-[#17351F]/60 leading-relaxed mb-4">
          Next you will go to Dodo Payments to enter billing and pay with card, UPI, or wallet. We never collect card or UPI details here.
        </p>

        {payError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-[11px] leading-relaxed">
            {payError}
          </div>
        )}

        <form onSubmit={handlePay}>
          <button
            type="submit"
            disabled={isProcessing}
            className={cn(
              "w-full text-white py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm transition-all shadow-sm flex items-center justify-center h-[52px]",
              "bg-[#17351F] hover:bg-[#2a5a35] disabled:opacity-70"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>REDIRECTING TO DODO...</span>
              </div>
            ) : (
              `CONTINUE TO PAYMENT · ${formatCurrency(amount)}`
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
