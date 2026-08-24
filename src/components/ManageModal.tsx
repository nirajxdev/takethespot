import React, { useState, useEffect, useRef } from 'react';
import { Plot } from '../types.ts';
import { formatCurrency, compressImageFile, getDaysLeft } from '../utils.ts';
import { motion } from 'motion/react';
import { X, Upload, CheckCircle2, Globe, ShieldCheck, AlertCircle } from 'lucide-react';

interface ManageModalProps {
  token: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ManageModal({ token, onClose, onUpdated }: ManageModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logo, setLogo] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadManagedPlots() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/manage/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || 'Could not load your spots.');
        }
        setPlots(data.plots || []);
        setBrandName(data.brandName || '');
        setWebsiteUrl(data.websiteUrl || '');
        setLogo(data.logo || '');
        setExpiresAt(data.expiresAt || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load spots for this management link.');
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadManagedPlots();
    }
  }, [token]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('Image file must be under 3MB');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setLogo(compressed);
      setError(null);
    } catch {
      setError('Could not process image. Please try a standard PNG or JPG.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError('Brand or Project name cannot be blank.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brandName.trim(),
          websiteUrl: websiteUrl.trim(),
          logo: logo.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Failed to save changes.');
      }

      setSuccessMsg(`Successfully updated ${data.updatedCount} active spot(s)!`);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save updates.');
    } finally {
      setIsSaving(false);
    }
  };

  const daysLeft = getDaysLeft(expiresAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111511]/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg max-h-[92dvh] rounded-sm shadow-2xl overflow-hidden my-auto border-2 border-[#17351F] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#17351F] text-[#F5F8EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#C8E87A]" size={18} />
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-[#C8E87A]">
                Manage Your Spots
              </h2>
              <p className="text-[9px] text-[#F5F8EC]/70 font-mono uppercase tracking-wider">
                Private Owner Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#F5F8EC]/60 hover:text-white transition-colors p-1 rounded-sm hover:bg-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[#17351F] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-[#17351F]/70">Verifying management access...</p>
          </div>
        ) : error && plots.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17351F] uppercase">Access Error</h3>
              <p className="text-xs text-[#17351F]/70 mt-1 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#17351F] text-[#C8E87A] text-xs font-mono font-bold uppercase rounded-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Spots Status Bar */}
            <div className="bg-[#FAFDF5] border border-[#C9D7B5] p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
              <div>
                <span className="text-[9px] text-[#17351F]/60 uppercase tracking-widest block font-bold">
                  ACTIVE SPOTS ({plots.length})
                </span>
                <span className="font-black text-[#17351F] text-sm">
                  {plots.map((p) => p.id).join(' · ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[9px] text-[#17351F]/60 uppercase tracking-widest block font-bold">
                    OWNERSHIP DURATION
                  </span>
                  <span className="font-bold text-[#17351F]">
                    {daysLeft} days remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Brand / Project Name */}
            <div>
              <label htmlFor="manageBrandName" className="block text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F] mb-1">
                BRAND / PROJECT NAME <span className="text-red-600">*</span>
              </label>
              <input
                id="manageBrandName"
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#17351F] transition-all bg-[#FAFDF5] text-xs sm:text-sm font-bold text-[#111511]"
                placeholder="My Brand or Project"
              />
            </div>

            {/* Destination URL */}
            <div>
              <label htmlFor="manageWebsiteUrl" className="block text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F] mb-1">
                DESTINATION WEBSITE URL
              </label>
              <div className="relative">
                <input
                  id="manageWebsiteUrl"
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 pl-8 rounded-sm border border-[#C9D7B5] focus:outline-none focus:ring-2 focus:ring-[#C8E87A] focus:border-[#17351F] transition-all bg-[#FAFDF5] text-xs sm:text-sm text-[#111511]"
                  placeholder="https://mywebsite.com"
                />
                <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#17351F]/40" />
              </div>
            </div>

            {/* Logo / Image */}
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold tracking-wider text-[#17351F] mb-1">
                SPOT LOGO / VISUAL
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white border-2 border-[#17351F] rounded-xs p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-mono font-bold text-[#17351F]/40">No Logo</span>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#FAFDF5] border border-[#C9D7B5] text-[#17351F] text-[10px] font-mono font-bold uppercase rounded-xs hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={12} />
                      <span>Upload New Image</span>
                    </button>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="px-2.5 py-1.5 text-red-600 text-[10px] font-mono font-bold uppercase hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-[#17351F]/60">
                    PNG, JPG, or SVG. We automatically optimize for high-DPI billboard rendering.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-sm text-xs border border-red-200 font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-sm text-xs border border-emerald-200 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#C9D7B5]/60">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 border border-[#C9D7B5] text-[#17351F] text-xs font-bold uppercase tracking-wider hover:bg-[#FAFDF5] transition-colors rounded-sm cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-2/3 bg-[#17351F] text-[#C8E87A] hover:bg-[#234e2e] py-2.5 text-xs font-black uppercase tracking-[0.14em] rounded-sm active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1.5 border border-[#17351F] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving Updates...' : 'Save Live Changes ✓'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
