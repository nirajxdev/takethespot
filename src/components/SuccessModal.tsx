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
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill base background
    ctx.fillStyle = '#F4F7F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw intricate borders
    const margin = 40;
    
    // Outer thick border
    ctx.strokeStyle = '#17351F';
    ctx.lineWidth = 12;
    ctx.strokeRect(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);
    
    // Inner thin border
    ctx.strokeStyle = '#2a5a35';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin + 15, margin + 15, canvas.width - (margin + 15) * 2, canvas.height - (margin + 15) * 2);

    // Another inner thick gold-ish border
    ctx.strokeStyle = '#C8E87A';
    ctx.lineWidth = 6;
    ctx.strokeRect(margin + 22, margin + 22, canvas.width - (margin + 22) * 2, canvas.height - (margin + 22) * 2);

    // Subtle background pattern or watermark
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#17351F';
    for (let i = 0; i < canvas.width; i += 60) {
      for (let j = 0; j < canvas.height; j += 60) {
        ctx.beginPath();
        ctx.arc(i, j, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Corner Ornaments
    const drawOrnament = (x: number, y: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = '#17351F';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.lineTo(0, 40);
      ctx.fill();
      
      ctx.fillStyle = '#C8E87A';
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(30, 10);
      ctx.lineTo(10, 30);
      ctx.fill();
      ctx.restore();
    };

    drawOrnament(margin + 22, margin + 22, 0); // Top Left
    drawOrnament(canvas.width - margin - 22, margin + 22, Math.PI / 2); // Top Right
    drawOrnament(canvas.width - margin - 22, canvas.height - margin - 22, Math.PI); // Bottom Right
    drawOrnament(margin + 22, canvas.height - margin - 22, -Math.PI / 2); // Bottom Left

    // Headers
    ctx.fillStyle = '#17351F';
    // Use letter-spacing workaround if standard property isn't supported, but we'll try standard string first
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    
    // Add letterSpacing if supported (fallback is fine)
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = '10px';
    }
    ctx.fillText('TAKE THE SPOT', canvas.width / 2, 140);
    
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = '0px';
    }

    ctx.fillStyle = '#17351F';
    ctx.font = '900 64px "Times New Roman", serif';
    ctx.fillText('CERTIFICATE OF OWNERSHIP', canvas.width / 2, 240);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 200, 280);
    ctx.lineTo(canvas.width / 2 + 200, 280);
    ctx.strokeStyle = '#C8E87A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Subtitle
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillStyle = '#2a5a35';
    ctx.fillText('This document hereby certifies that', canvas.width / 2, 360);

    // Brand Name
    ctx.font = 'bold 72px "Times New Roman", serif';
    ctx.fillStyle = '#111511';
    ctx.fillText(brandName.toUpperCase(), canvas.width / 2, 460);

    // Plots
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText('is the official and exclusive owner of the following digital block(s):', canvas.width / 2, 540);
    
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#2a5a35';
    const plotsText = plots.map(p => p.id).join(', ');
    ctx.fillText(plotsText, canvas.width / 2, 610);

    // Date
    ctx.font = 'italic 20px "Times New Roman", serif';
    ctx.fillStyle = '#17351F';
    const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`Issued on this day, ${issueDate}`, canvas.width / 2, 690);

    // Signature Area
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 120, 770);
    ctx.lineTo(canvas.width / 2 + 120, 770);
    ctx.strokeStyle = '#17351F';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#2a5a35';
    ctx.fillText('Authorized Signature', canvas.width / 2, 795);

    // Add a seal/badge in bottom left
    const drawSeal = (x: number, y: number, radius: number) => {
      ctx.save();
      ctx.translate(x, y);
      
      // Starburst
      ctx.fillStyle = '#C8E87A';
      ctx.beginPath();
      for (let i = 0; i < 30; i++) {
        ctx.rotate(Math.PI / 15);
        ctx.lineTo(0, radius);
        ctx.rotate(Math.PI / 15);
        ctx.lineTo(0, radius - 15);
      }
      ctx.closePath();
      ctx.fill();

      // Inner circles
      ctx.beginPath();
      ctx.arc(0, 0, radius - 18, 0, Math.PI * 2);
      ctx.fillStyle = '#17351F';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, radius - 22, 0, Math.PI * 2);
      ctx.strokeStyle = '#C8E87A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Seal Text
      ctx.fillStyle = '#C8E87A';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VERIFIED', 0, -10);
      ctx.fillText('OWNER', 0, 10);
      
      ctx.restore();
    };

    drawSeal(200, 710, 65);

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
