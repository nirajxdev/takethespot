import React, { useState } from 'react';
import { Plot } from '../types.ts';
import { cn, getInitials, formatCurrency } from '../utils.ts';

interface PlotSquareProps {
  plot: Plot;
  mergedPlots?: Plot[];
  isSelected: boolean;
  isMerged?: boolean;
  colSpan?: number;
  rowSpan?: number;
  isFitMode?: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export default function PlotSquare({
  plot,
  mergedPlots,
  isSelected,
  isMerged,
  colSpan,
  rowSpan,
  isFitMode = false,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PlotSquareProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isOwned = plot.status === 'owned';
  const label = mergedPlots ? `${mergedPlots.length} BLOCKS` : plot.id;
  const initials = getInitials(plot.brandName || plot.websiteUrl || '');
  const takeoverPrice = Math.round(plot.currentPrice * 2.5);

  const style = {
    gridColumn: colSpan ? `span ${colSpan} / span ${colSpan}` : undefined,
    gridRow: rowSpan ? `span ${rowSpan} / span ${rowSpan}` : undefined,
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-150 ease-out w-full h-full flex items-center justify-center overflow-visible origin-center select-none touch-manipulation",
        // Available spot - default & hover
        !isOwned && !isSelected && "bg-[#FAFDF5] hover:bg-white hover:z-20 hover:scale-[1.04] active:bg-[#EAF5D5] hover:shadow-[0_0_0_2px_#17351F,0_4px_16px_rgba(23,53,31,0.18)]",
        // Available spot - selected
        !isOwned && isSelected && "bg-[#C8E87A] z-30 scale-[1.03] shadow-[0_0_0_2px_#17351F,0_0_12px_rgba(200,232,122,0.85)] ring-2 ring-[#17351F]",
        // Owned spot - default & hover
        isOwned && !isSelected && "bg-white hover:z-20 hover:scale-[1.03] active:scale-98 hover:shadow-[0_0_0_2px_#17351F,0_6px_16px_rgba(23,53,31,0.2)]",
        // Owned spot - selected (for takeover)
        isOwned && isSelected && "bg-[#FFF9E6] z-30 scale-[1.03] shadow-[0_0_0_2px_#D97706,0_0_12px_rgba(217,119,6,0.5)] ring-2 ring-[#D97706]",
        // Deep-linked Highlight Pulse
        isHighlighted && "animate-bounce ring-4 ring-[#C8E87A] z-40 shadow-[0_0_20px_#C8E87A]"
      )}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center overflow-hidden focus:outline-none relative p-[1px] sm:p-0.5 cursor-pointer"
        title={isOwned ? `${plot.brandName || 'Claimed Spot'} (${plot.id}) — Takeover for ${formatCurrency(takeoverPrice)}` : `Spot ${plot.id} — Available for $1.00`}
      >
        {isOwned ? (
          <div className={cn(
            "flex flex-col w-full h-full items-center justify-center p-[1px] sm:p-1 rounded-[1px] relative overflow-hidden transition-colors",
            isSelected ? "bg-[#FFFDF0] border-2 border-[#D97706]" : "bg-white border border-[#17351F]/15"
          )}>
            {plot.logo && !imageFailed ? (
              <img
                src={plot.logo}
                alt={plot.brandName || 'Spot logo'}
                onError={() => setImageFailed(true)}
                className={cn(
                  "object-contain w-full h-full transition-transform duration-200 group-hover:scale-105",
                  isMerged ? "max-h-[96%]" : "max-h-[92%]"
                )}
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-[#FAFDF5] rounded-xs p-0.5 border border-[#C9D7B5]/60">
                <span className={cn(
                  "font-mono font-black text-[#17351F] tracking-wider leading-none",
                  isMerged ? "text-sm sm:text-2xl md:text-3xl" : isFitMode ? "text-[7px]" : "text-[8px] sm:text-xs md:text-sm"
                )}>
                  {initials}
                </span>
                {plot.brandName && !isFitMode && (
                  <span
                    className={cn(
                      "leading-none uppercase font-bold text-[#17351F]/80 text-center w-full truncate mt-0.5 sm:mt-1",
                      isMerged ? "text-[8px] sm:text-xs md:text-sm tracking-wide font-black" : "text-[4px] sm:text-[7px]"
                    )}
                  >
                    {plot.brandName}
                  </span>
                )}
              </div>
            )}

            {/* Selection Takeover Badge */}
            {isSelected ? (
              <div className="absolute top-0 right-0 bg-[#D97706] text-white px-1 py-0.2 rounded-bl-xs text-[6px] sm:text-[8px] font-mono font-black tracking-tighter leading-none shadow-xs">
                {formatCurrency(takeoverPrice)}
              </div>
            ) : (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#17351F]/40 group-hover:bg-[#17351F] transition-colors" />
            )}
          </div>
        ) : (
          isSelected ? (
            <div className="flex flex-col items-center justify-center w-full h-full bg-[#C8E87A] text-[#17351F] leading-none">
              <span className={cn("font-black", isFitMode ? "text-[8px]" : "text-xs sm:text-sm")}>✓</span>
              {!isFitMode && (
                <span className="text-[7px] sm:text-[9px] font-mono font-black tracking-wider mt-0.5">{plot.id}</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              {/* Default coordinate label */}
              <span className={cn(
                "text-[#17351F]/50 font-mono font-medium transition-all duration-150 select-none leading-none",
                isFitMode ? "text-[6px] sm:text-[7px]" : "text-[7px] sm:text-[9px] md:text-[10px] group-hover:hidden"
              )}>
                {isFitMode && !mergedPlots ? plot.id.replace(/^[A-Z]/, '') : label}
              </span>
              {/* Hover action prompt for desktop pointer devices */}
              {!isFitMode && (
                <div className="hidden group-hover:flex flex-col items-center justify-center leading-none">
                  <span className="text-[6px] sm:text-[7px] font-mono font-bold text-[#17351F]/70 uppercase tracking-tighter">
                    CLAIM {plot.id}
                  </span>
                  <span className="text-[8px] sm:text-xs font-mono font-black text-[#17351F] mt-0.5">
                    $1
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </button>
    </div>
  );
}

