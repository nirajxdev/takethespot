import { useState, useEffect, useRef } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import { formatCurrency, compressImageFile, fetchSiteIdentity, getInitials } from '../utils.ts';
import { motion } from 'motion/react';
import { Upload, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PurchaseModalProps {
  selectedIds: string[];
  plots: Plot[];
  config: MarketConfig;
  onClose: () => void;
  onProceed: (details: { brandName: string; logo: string; websiteUrl: string }) => void;
}

export default function PurchaseModal({ selectedIds, plots, config, onClose, onProceed }: PurchaseModalProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [detectedLogo, setDetectedLogo] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionAttempted, setDetectionAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedPlots = selectedIds.map(id => plots.find(p => p.id === id)).filter(Boolean) as Plot[];
  
  const totalCost = selectedPlots.reduce((sum, plot) => {
    if (plot.status === 'available') {
      return sum + plot.currentPrice;
    } else {
      return sum + Math.round(plot.currentPrice * config.takeoverMultiplier);
    }
  }, 0);

  // Auto-detect site identity when URL changes
  useEffect(() => {
    const trimmed = websiteUrl.trim();
    if (!trimmed || trimmed.length < 4 || !trimmed.includes('.')) {
      setDetectedLogo(null);
      setDetectionAttempted(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsDetecting(true);
      setDetectionAttempted(true);
      try {
        const identity = await fetchSiteIdentity(trimmed);
        if (identity.logoUrl) {
          setDetectedLogo(identity.logoUrl);
        } else {
          setDetectedLogo(null);
        }
        if (!brandName && identity.title) {
          setBrandName(identity.title);
        }
      } catch (err) {
        console.warn('Auto visual extraction failed', err);
        setDetectedLogo(null);
      } finally {
        setIsDetecting(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [websiteUrl, brandName]);

  // Determine active visual source: Custom > Detected > Initials
  const activeLogo = customLogo || detectedLogo || '';
  const previewInitials = getInitials(brandName || websiteUrl || 'TTS');

  // Handle Custom Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('Image file must be under 3MB');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setCustomLogo(compressed);
      setError(null);
    } catch {
      setError('Could not process that image. Please try a standard PNG or JPG.');
    }
  };

  const handleRemoveCustomLogo = () => {
    setCustomLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError("Please provide your name, project, or brand.");
      return;
    }
    onProceed({
      brandName: brandName.trim(),
      logo: activeLogo,
      websiteUrl: websiteUrl.trim(),
    });
  };

  // If no spot is selected, show instructional guide state instead of a fake selection
  if (selectedIds.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/70 backdrop-blur-xs overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden my-auto border-2 border-[#17351F]"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#17351F] text-[#F5F8EC] flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-[#C8E87A]">
              Claim Your Spot
            </h2>
            <button 
              onClick={onClose} 
              className="text-[#F5F8EC]/60 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/10 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FAFDF5] border border-[#C9D7B5] flex items-center justify-center mx-auto text-[#17351F]">
              <Upload size={20} className="rotate-45" />
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-[#17351F] font-serif">
                Which spot would you like to claim?
              </h3>
              <p className="text-xs text-[#17351F]/70 mt-1.5 leading-relaxed">
                Select an available square on the board to continue.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#C8E87A] text-[#17351F] py-2.5 text-xs font-black uppercase tracking-[0.14em] rounded-sm hover:bg-[#b5d36e] active:scale-95 transition-all shadow-sm border border-[#17351F] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Choose a Spot →</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/70 backdrop-blur-xs overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden my-auto border-2 border-[#17351F]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#17351F] text-[#F5F8EC] flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-[#C8E87A]">
              Claim Your Spot
            </h2>
            <p className="text-[10px] text-[#F5F8EC]/70 font-mono uppercase tracking-widest mt-0.5">
              {selectedIds.length === 1 ? `Spot ${selectedIds[0]}` : `${selectedIds.length} Spots (${selectedIds.join(' · ')})`} · $1 each
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#F5F8EC]/60 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* STEP 1: Website / Link */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label htmlFor="websiteUrl" className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F]">
                01. WEBSITE OR PROJECT LINK <span className="text-[#17351F]/40 font-normal">(OPTIONAL)</span>
              </label>
              {isDetecting && (
                <span className="text-[9px] text-[#17351F] font-mono font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" />
                  Finding your site's icon...
                </span>
              )}
            </div>
            <input
              id="websiteUrl"
              type="text"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#17351F] transition-all bg-[#FAFDF5] text-xs sm:text-sm text-[#111511]"
              placeholder="https://yourwebsite.com"
            />
            <p className="text-[10px] text-[#17351F]/60 mt-1">
              Add a link and we'll automatically find an icon for your spot.
            </p>
          </div>

          {/* STEP 2: Name / Identity */}
          <div>
            <label htmlFor="brandName" className="block text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F] mb-1">
              02. YOUR NAME OR IDENTITY <span className="text-red-600 font-bold">*</span>
            </label>
            <input
              id="brandName"
              type="text"
              required
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              className="w-full px-3 py-2 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#17351F] transition-all bg-[#FAFDF5] text-xs sm:text-sm font-bold text-[#111511]"
              placeholder="Niraj, @nirajxdev, My Startup, or Cool Project"
            />
          </div>

          {/* STEP 3: Your Spot & Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F]">
                03. YOUR SPOT
              </span>
              <span className="text-[9px] font-mono text-[#17351F]/60 uppercase tracking-widest">
                LIVE SPOT PREVIEW
              </span>
            </div>

            {/* Preview Box styled like live board */}
            <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-3.5 rounded-sm flex flex-col items-center justify-center">
              <div className="flex items-center justify-center py-2">
                <div className="w-20 h-20 bg-white border-2 border-[#17351F] rounded-xs shadow-md p-1 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  {activeLogo ? (
                    <img 
                      src={activeLogo} 
                      alt="Spot Preview" 
                      className="w-full h-full object-contain max-h-[92%]" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-[#F5F8EC] rounded-xs p-1 border border-[#C9D7B5]/60">
                      <span className="font-mono font-black text-[#17351F] text-base tracking-wider leading-none">
                        {previewInitials}
                      </span>
                      <span className="text-[6px] font-bold uppercase text-[#17351F]/80 truncate max-w-full px-0.5 mt-1 leading-none">
                        {brandName || 'YOUR NAME'}
                      </span>
                    </div>
                  )}

                  {/* Spot coordinate tag */}
                  <span className="absolute top-0.5 left-1 text-[7px] font-mono font-bold text-[#17351F]/40 leading-none">
                    {selectedIds.join(' · ')}
                  </span>

                  {/* Owned indicator dot */}
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#17351F]" />
                </div>
              </div>

              {/* Status Message below preview */}
              <div className="mt-1 text-center">
                {customLogo ? (
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#17351F]">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Using your custom image</span>
                  </div>
                ) : detectedLogo ? (
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#17351F]">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Using an icon from your website</span>
                  </div>
                ) : detectionAttempted && websiteUrl.trim() ? (
                  <p className="text-[10px] text-[#17351F]/70">
                    We couldn't find an icon, so we're using your initials.
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-[#17351F]">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Using your initials</span>
                  </div>
                )}
              </div>

              {/* Upload Custom Image Secondary Action */}
              <div className="mt-2 pt-2 border-t border-[#C9D7B5]/60 w-full flex items-center justify-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="custom-logo-input"
                />

                {customLogo ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#17351F] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Upload size={11} />
                      Change image
                    </button>
                    <span className="text-[#17351F]/30">·</span>
                    <button
                      type="button"
                      onClick={handleRemoveCustomLogo}
                      className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#17351F] hover:text-[#2a5a35] hover:bg-white bg-[#F5F8EC] px-3 py-1 rounded-xs border border-[#C9D7B5] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Upload size={11} />
                    <span>Upload custom image (optional)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Price & Summary Breakdown */}
          <div className="bg-[#17351F] text-[#F5F8EC] px-3.5 py-2.5 rounded-sm flex items-center justify-between font-mono">
            <div>
              <div className="text-[9px] text-[#C8E87A] font-bold uppercase tracking-wider">
                {selectedIds.length} Spot{selectedIds.length === 1 ? '' : 's'} · {config.ownershipDurationDays}-day ownership
              </div>
              <div className="text-[10px] text-white/70">
                {selectedIds.join(' · ')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-white/50 uppercase tracking-widest block">Total</span>
              <span className="text-base sm:text-lg font-black text-[#C8E87A]">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 text-red-700 rounded-sm text-xs border border-red-200 font-medium">
              {error}
            </div>
          )}

          {/* Form CTA Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 border border-[#C9D7B5] text-[#17351F] text-xs font-bold uppercase tracking-wider hover:bg-[#FAFDF5] transition-colors rounded-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-2/3 bg-[#C8E87A] text-[#17351F] py-2.5 text-xs font-black uppercase tracking-[0.14em] rounded-sm hover:bg-[#b5d36e] active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1.5 border border-[#17351F] cursor-pointer"
            >
              Continue to Payment →
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

