import { motion, AnimatePresence } from 'motion/react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#111511]/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-[#FAFDF5] rounded-sm shadow-2xl border-2 border-[#17351F] overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C9D7B5]">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-[0.15em] text-[#17351F]">
                    How It Works
                  </h2>
                  <p className="text-[11px] text-[#17351F]/70 font-mono mt-0.5">
                    A shared digital board of 288 permanent spots.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[#17351F]/10 text-[#17351F] transition-colors"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-xs text-[#17351F]/90 leading-relaxed">
                <div className="flex gap-3 items-start bg-white p-3 border border-[#C9D7B5] rounded-sm">
                  <div className="w-6 h-6 shrink-0 rounded-xs bg-[#C8E87A] border border-[#17351F] flex items-center justify-center font-mono font-black text-[10px] text-[#17351F]">
                    01
                  </div>
                  <div>
                    <strong className="text-[#17351F] uppercase tracking-wide block mb-0.5">Pick Any Available Spot</strong>
                    <span>Choose any empty square on the board for $1. You can claim multiple adjacent spots to create larger merged blocks.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-white p-3 border border-[#C9D7B5] rounded-sm">
                  <div className="w-6 h-6 shrink-0 rounded-xs bg-[#17351F] flex items-center justify-center font-mono font-black text-[10px] text-[#C8E87A]">
                    02
                  </div>
                  <div>
                    <strong className="text-[#17351F] uppercase tracking-wide block mb-0.5">Automatic Identity & Optional Logo</strong>
                    <span>Enter your website URL to auto-extract your site icon/logo, upload a custom image, or use clean initials. Uploading is 100% optional.</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-white p-3 border border-[#C9D7B5] rounded-sm">
                  <div className="w-6 h-6 shrink-0 rounded-xs bg-[#F5F8EC] border border-[#17351F] flex items-center justify-center font-mono font-black text-[10px] text-[#17351F]">
                    03
                  </div>
                  <div>
                    <strong className="text-[#17351F] uppercase tracking-wide block mb-0.5">Live on the Shared Board</strong>
                    <span>Your spot becomes visible to everyone on the internet. Ownership lasts 90 days. Other visitors can acquire spots for 2.5× current value.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-6 bg-[#17351F] text-[#C8E87A] py-3.5 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a5a35] transition-colors shadow-sm"
              >
                Got It, Let's Pick a Spot →
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

