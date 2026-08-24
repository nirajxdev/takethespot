import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Plot } from '../types.ts';
import { motion } from 'motion/react';
import { Check, Copy, Share2, Shield, Download, Sparkles } from 'lucide-react';

interface SuccessModalProps {
  plots: Plot[];
  brandName: string;
  manageToken?: string;
  onClose: () => void;
}

export default function SuccessModal({ plots, brandName, manageToken, onClose }: SuccessModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const managementUrl = manageToken
    ? `${window.location.origin}/?manage=${encodeURIComponent(manageToken)}`
    : '';

  const spotIds = plots.map((p) => p.id).join(' · ');
  const firstSpotId = plots[0]?.id || 'A1';
  const shareText = `I just claimed space (${spotIds}) on @TakeTheSpot_lol for 90 days. Think you can take it?`;
  const shareUrl = `${window.location.origin}/?spot=${encodeURIComponent(firstSpotId)}`;

  useEffect(() => {
    const colors = ['#C8E87A', '#C9D7B5', '#17351F', '#F5F8EC'];

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti(
        Object.assign(
          {},
          {
            colors: colors,
            disableForReducedMotion: true,
            zIndex: 1000,
            origin: { y: 0.6 },
          },
          opts,
          {
            particleCount: Math.floor(200 * particleRatio),
          },
        ),
      );
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const handleCopyManageLink = () => {
    if (!managementUrl) return;
    navigator.clipboard.writeText(managementUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareX = () => {
    const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xIntent, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const liIntent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl,
    )}`;
    window.open(liIntent, '_blank', 'noopener,noreferrer');
  };

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
    ctx.strokeRect(
      margin + 15,
      margin + 15,
      canvas.width - (margin + 15) * 2,
      canvas.height - (margin + 15) * 2,
    );

    // Inner gold/lime border
    ctx.strokeStyle = '#C8E87A';
    ctx.lineWidth = 6;
    ctx.strokeRect(
      margin + 22,
      margin + 22,
      canvas.width - (margin + 22) * 2,
      canvas.height - (margin + 22) * 2,
    );

    // Background watermark pattern
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

    drawOrnament(margin + 22, margin + 22, 0);
    drawOrnament(canvas.width - margin - 22, margin + 22, Math.PI / 2);
    drawOrnament(canvas.width - margin - 22, canvas.height - margin - 22, Math.PI);
    drawOrnament(margin + 22, canvas.height - margin - 22, -Math.PI / 2);

    // Headers
    ctx.fillStyle = '#17351F';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAKETHESPOT.LOL', canvas.width / 2, 140);

    ctx.fillStyle = '#17351F';
    ctx.font = '900 60px "Times New Roman", serif';
    ctx.fillText('CERTIFICATE OF 90-DAY OWNERSHIP', canvas.width / 2, 235);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 220, 275);
    ctx.lineTo(canvas.width / 2 + 220, 275);
    ctx.strokeStyle = '#C8E87A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Subtitle
    ctx.font = 'italic 26px "Times New Roman", serif';
    ctx.fillStyle = '#2a5a35';
    ctx.fillText('This document hereby certifies that', canvas.width / 2, 350);

    // Brand Name
    ctx.font = 'bold 64px "Times New Roman", serif';
    ctx.fillStyle = '#111511';
    ctx.fillText(brandName.toUpperCase(), canvas.width / 2, 440);

    // Plots
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#17351F';
    ctx.fillText(
      'has claimed active digital placement on the public billboard for the following block(s):',
      canvas.width / 2,
      520,
    );

    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = '#2a5a35';
    const plotsText = plots.map((p) => p.id).join(', ');
    ctx.fillText(plotsText, canvas.width / 2, 580);

    // Expiry Notice
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#17351F';
    ctx.fillText('90-DAY ACTIVE PERIOD · ACQUIRABLE AT 2.5× VALUATION', canvas.width / 2, 630);

    // Date
    ctx.font = 'italic 19px "Times New Roman", serif';
    ctx.fillStyle = '#17351F';
    const issueDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`Issued on ${issueDate}`, canvas.width / 2, 690);

    // Signature Area
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 120, 765);
    ctx.lineTo(canvas.width / 2 + 120, 765);
    ctx.strokeStyle = '#17351F';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#2a5a35';
    ctx.fillText('TakeTheSpot Verified Protocol', canvas.width / 2, 790);

    // Download PNG
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${brandName.replace(/\s+/g, '_')}_TakeTheSpot_Certificate.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-sm shadow-2xl relative border-2 border-[#17351F] p-5 sm:p-7 text-center my-auto"
      >
        <div className="w-14 h-14 bg-[#17351F] text-[#C8E87A] rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-[#C8E87A]">
          <Sparkles size={24} />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-[#17351F] uppercase tracking-tight font-serif mb-1">
          Your Spot is Live!
        </h3>
        <p className="text-xs sm:text-sm text-[#17351F]/80 mb-4 font-medium">
          <strong className="text-[#17351F]">{brandName}</strong> has claimed{' '}
          <strong>{plots.length} spot(s)</strong> ({spotIds}) on the billboard.
        </p>

        {/* 90-Day Guarantee Notice */}
        <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-2.5 rounded-sm mb-4 text-[10px] font-mono text-[#17351F] flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider">Active Duration:</span>
          <span className="bg-[#C8E87A] text-[#17351F] font-black px-2 py-0.5 rounded-xs">
            90 DAYS GUARANTEED
          </span>
        </div>

        {/* Private Management Link Box */}
        {managementUrl && (
          <div className="bg-[#17351F] text-[#F5F8EC] p-3 rounded-sm mb-4 text-left font-mono space-y-1.5 border border-[#C8E87A]/30">
            <div className="flex items-center gap-1.5 text-[#C8E87A] text-[9px] font-black uppercase tracking-wider">
              <Shield size={12} />
              <span>Your Private Management Link</span>
            </div>
            <p className="text-[9px] text-white/70 leading-snug">
              Save or bookmark this secret URL to update your logo, name, or website anytime:
            </p>
            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xs border border-white/10">
              <input
                type="text"
                readOnly
                value={managementUrl}
                className="bg-transparent text-[9px] text-[#C8E87A] w-full font-mono focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyManageLink}
                className="px-2 py-1 bg-[#C8E87A] text-[#17351F] text-[9px] font-bold uppercase rounded-xs hover:bg-[#b5d36e] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
              >
                {copiedLink ? <Check size={10} /> : <Copy size={10} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Social Sharing Intent */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareX}
              className="py-2.5 bg-[#111511] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs hover:bg-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </button>

            <button
              type="button"
              onClick={handleShareLinkedIn}
              className="py-2.5 bg-[#0077B5] text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs hover:bg-[#006097] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Share2 size={12} />
              <span>LinkedIn</span>
            </button>
          </div>

          <button
            onClick={downloadCertificate}
            className="w-full bg-[#FAFDF5] border border-[#17351F] text-[#17351F] py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xs hover:bg-[#F5F8EC] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} />
            <span>Download 90-Day Certificate</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-[#17351F] text-[#C8E87A] py-3 text-xs font-black uppercase tracking-[0.16em] rounded-sm hover:bg-[#234e2e] active:scale-95 transition-all cursor-pointer mt-1"
          >
            Return to Live Board →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
