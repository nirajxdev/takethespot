import { Plot } from '../types.ts';
import { cn } from '../utils.ts';

interface PlotSquareProps {
  plot: Plot;
  siblingPlot?: Plot;
  isSelected: boolean;
  isMerged?: boolean;
  spanDirection?: 'col' | 'row';
  onClick: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export default function PlotSquare({ plot, siblingPlot, isSelected, isMerged, spanDirection, onClick, onMouseEnter, onMouseLeave }: PlotSquareProps) {
  const isOwned = plot.status === 'owned';
  const label = siblingPlot ? `${plot.id} · ${siblingPlot.id}` : plot.id;

  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all duration-300 ease-out w-full h-full flex items-center justify-center overflow-visible origin-center",
        spanDirection === 'col' && "col-span-2",
        spanDirection === 'row' && "row-span-2",
        !isOwned && !isSelected && "bg-[#F5F8EC] hover:bg-white hover:z-20 hover:scale-[1.08] hover:shadow-[0_0_0_2px_#C8E87A,0_0_12px_rgba(200,232,122,0.8)]",
        !isOwned && isSelected && "bg-[#C8E87A] z-10 shadow-[0_0_0_2px_#17351F]",
        isOwned && !isSelected && "bg-white hover:z-20 hover:scale-[1.03] hover:shadow-[0_0_0_2px_#17351F,0_0_15px_rgba(23,53,31,0.2)]",
        isOwned && isSelected && "bg-white z-10 shadow-[0_0_0_2px_#C8E87A]"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onClick}
        className="w-full h-full flex flex-col items-center justify-center overflow-hidden focus:outline-none"
      >
        {isOwned ? (
          <div className="flex flex-col w-full h-full items-center justify-center p-1 sm:p-2 bg-white">
            {plot.logo && (
              <img src={plot.logo} alt={plot.brandName || "Logo"} className={cn("object-contain mb-1", isMerged ? "w-8 h-8 sm:w-12 sm:h-12" : "w-4 h-4 sm:w-6 sm:h-6")} />
            )}
            <span className={cn(
              "leading-tight uppercase font-black text-[#17351F] text-center w-full break-words",
              isMerged ? "text-[10px] sm:text-[14px] tracking-widest" : "text-[5px] sm:text-[7px] tracking-wider"
            )}>
              {plot.brandName}
            </span>
          </div>
        ) : (
          isSelected ? (
            <span className="text-[10px] sm:text-xs text-[#17351F] font-bold">✓</span>
          ) : (
            <span className="text-[8px] sm:text-[10px] text-[#C9D7B5] font-mono transition-colors group-hover:text-[#C8E87A]">{label}</span>
          )
        )}
      </button>
    </div>
  );
}
