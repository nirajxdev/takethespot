import React from 'react';
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
            className="absolute inset-0 bg-[#111511]/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#F5F8EC] rounded-sm shadow-xl border border-[#C9D7B5] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-[0.1em] text-[#17351F]">
                  How to Play
                </h2>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[#C9D7B5]/30 text-[#17351F] transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm text-[#17351F]/80 leading-relaxed">
                <div className="flex gap-3">
                  <div className="w-5 h-5 shrink-0 rounded bg-[#C9D7B5] mt-0.5"></div>
                  <p><strong>Claim Available Spots:</strong> Select any green blocks on the canvas to claim them. You can buy as many available blocks as you want at the initial base price.</p>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-5 h-5 shrink-0 rounded bg-[#17351F] mt-0.5"></div>
                  <p><strong>Upload Your Content:</strong> Once purchased, you can upload an image or logo and set a redirect URL. Your content will be visible to everyone who visits the canvas.</p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 shrink-0 rounded border-2 border-red-500/50 flex items-center justify-center mt-0.5"><span className="text-red-500 font-bold text-[10px]">!</span></div>
                  <p><strong>Hostile Takeovers:</strong> Owned spots aren't yours forever! Other users can take over your spot by paying a premium multiplier. Keep an eye on your blocks.</p>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 shrink-0 rounded bg-black/10 mt-0.5"></div>
                  <p><strong>Merge Blocks:</strong> Soon you'll be able to merge adjacent blocks to display larger images. Claim strategic areas to build a bigger presence!</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-8 bg-[#17351F] text-white py-3.5 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a5a35] transition-colors shadow-sm"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
