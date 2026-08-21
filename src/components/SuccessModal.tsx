import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Plot } from '../types.ts';
import { motion } from 'motion/react';

interface SuccessModalProps {
  plots: Plot[];
  brandName: string;
  onClose: () => void;
}

export default function SuccessModal({ plots, brandName, onClose }: SuccessModalProps) {
  useEffect(() => {
    const colors = ['#C8E87A', '#C9D7B5', '#17351F', '#F5F8EC'];
    
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti(Object.assign({}, {
        colors: colors,
        disableForReducedMotion: true,
        zIndex: 1000,
        origin: { y: 0.6 }
      }, opts, {
        particleCount: Math.floor(200 * particleRatio)
      }));
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const downloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#F5F8EC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#17351F';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Title
    ctx.fillStyle = '#17351F';
    ctx.font = 'bold 40px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF OWNERSHIP', canvas.width / 2, 120);
    
    // Subtitle
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText('This certifies that', canvas.width / 2, 200);

    // Brand Name
    ctx.font = 'bold 48px serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText(brandName.toUpperCase(), canvas.width / 2, 280);

    // Plots
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText('is the official owner of the following digital plots:', canvas.width / 2, 360);
    
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#2a5a35';
    ctx.fillText(plots.map(p => p.id).join(', '), canvas.width / 2, 420);

    // Date
    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText(`Issued on ${new Date().toLocaleDateString()}`, canvas.width / 2, 520);

    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${brandName.replace(/\s+/g, '_')}_Certificate.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111511]/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#C8E87A] w-full max-w-sm rounded-sm shadow-xl overflow-hidden relative border border-[#17351F] p-8 text-center"
      >
        <div className="w-16 h-16 bg-[#17351F] text-[#C8E87A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h3 className="text-3xl font-black text-[#17351F] uppercase tracking-widest font-serif mb-2">Success!</h3>
        <p className="text-sm text-[#17351F]/80 mb-8 font-medium">
          {brandName} is now the proud owner of {plots.length} spot(s) on the board.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={downloadCertificate}
            className="w-full bg-[#17351F] text-white py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a5a35] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Certificate
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-white/50 text-[#17351F] py-4 text-xs font-black uppercase tracking-[0.2em] rounded-sm hover:bg-white transition-colors"
          >
            Return to Board
          </button>
        </div>
      </motion.div>
    </div>
  );
}
