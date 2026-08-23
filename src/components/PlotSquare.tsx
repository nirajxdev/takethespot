import { useState } from 'react';
import { Plot } from '../types.ts';
import { cn, getInitials } from '../utils.ts';

interface PlotSquareProps {
  plot: Plot;
  mergedPlots?: Plot[];
  isSelected: boolean;
  isMerged?: boolean;
  colSpan?: number;
  rowSpan?: number;
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
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PlotSquareProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isOwned = plot.status === 'owned';
  const label = mergedPlots ? `${mergedPlots.length} BLOCKS` : plot.id;
  const initials = getInitials(plot.brandName || plot.websiteUrl || '');

  const style = {
    gridColumn: colSpan ? `span ${colSpan} / span ${colSpan}` : undefined,
    gridRow: rowSpan ? `span ${rowSpan} / span ${rowSpan}` : undefined,
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-150 ease-out w-full h-full flex items-center justify-center overflow-visible origin-center select-none",
        // Available spot - default & hover
        !isOwned && !isSelected && "bg-[#FAFDF5] hover:bg-white hover:z-20 hover:scale-[1.04] hover:shadow-[0_0_0_2px_#17351F,0_4px_16px_rgba(23,53,31,0.18)]",
        // Available spot - selected
        !isOwned && isSelected && "bg-[#C8E87A] z-30 scale-[1.05] shadow-[0_0_0_2px_#17351F,0_0_14px_rgba(200,232,122,0.85)] ring-2 ring-[#17351F]",
        // Owned spot - default & hover
        isOwned && !isSelected && "bg-white hover:z-20 hover:scale-[1.03] hover:shadow-[0_0_0_2px_#17351F,0_6px_16px_rgba(23,53,31,0.2)]",
        // Owned spot - selected (for takeover)
        isOwned && isSelected && "bg-[#FFF9E6] z-30 scale-[1.04] shadow-[0_0_0_2px_#D97706,0_0_14px_rgba(217,119,6,0.4)] ring-2 ring-[#D97706]"
      )}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center overflow-hidden focus:outline-none relative p-0.5 cursor-pointer"
        title={isOwned ? `${plot.brandName || 'Claimed Spot'} (${plot.id})` : `Spot ${plot.id} - Available for $1`}
      >
        {isOwned ? (
          <div className="flex flex-col w-full h-full items-center justify-center p-0.5 sm:p-1 bg-white border border-[#17351F]/15 rounded-[1px] relative overflow-hidden">
            {plot.logo && !imageFailed ? (
              <img
                src={plot.logo}
                alt={plot.brandName || 'Spot logo'}
                onError={() => setImageFailed(true)}
                className="object-contain w-full h-full max-h-[92%] transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-[#FAFDF5] rounded-xs p-0.5 border border-[#C9D7B5]/60">
                <span className="font-mono font-black text-[#17351F] text-[10px] sm:text-xs md:text-sm tracking-wider leading-none">
                  {initials}
                </span>
                {plot.brandName && (
                  <span
                    className={cn(
                      "leading-none uppercase font-bold text-[#17351F]/80 text-center w-full truncate mt-1",
                      isMerged ? "text-[8px] sm:text-[11px] tracking-wide" : "text-[5px] sm:text-[7px]"
                    )}
                  >
                    {plot.brandName}
                  </span>
                )}
              </div>
            )}

            {/* Subtle owned indicator corner dot */}
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#17351F]/40 group-hover:bg-[#17351F] transition-colors" />
          </div>
        ) : (
          isSelected ? (
            <div className="flex flex-col items-center justify-center w-full h-full bg-[#C8E87A] text-[#17351F]">
              <span className="text-xs sm:text-sm font-black leading-none">✓</span>
              <span className="text-[8px] sm:text-[9px] font-mono font-black tracking-wider mt-0.5">{plot.id}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              {/* Default coordinate label - comfortable, balanced contrast */}
              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-[#17351F]/45 font-mono font-medium transition-all duration-150 group-hover:hidden select-none">
                {label}
              </span>
              {/* Hover action prompt */}
              <div className="hidden group-hover:flex flex-col items-center justify-center leading-none">
                <span className="text-[6px] sm:text-[7px] font-mono font-bold text-[#17351F]/70 uppercase tracking-tighter">
                  CLAIM {plot.id}
                </span>
                <span className="text-[9px] sm:text-xs font-mono font-black text-[#17351F] mt-0.5">
                  $1
                </span>
              </div>
            </div>
          )
        )}
      </button>
    </div>
  );
}

