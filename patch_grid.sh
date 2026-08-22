#!/bin/bash
cat << 'INNER_EOF' > src/components/Grid.tsx
import { useState, useEffect } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import PlotSquare from './PlotSquare.tsx';
import { getDaysLeft } from '../utils.ts';
import { createPortal } from 'react-dom';

export interface ExtendedPlot extends Plot {
  isMerged?: boolean;
  colSpan?: number;
  rowSpan?: number;
  mergedIds?: string[];
  mergedPlots?: Plot[];
}

interface GridProps {
  plots: Plot[];
  selectedPlots: string[];
  onPlotClick: (plot: Plot, mergedPlots?: Plot[]) => void;
  config: MarketConfig;
  isLoading?: boolean;
}

export default function Grid({ plots, selectedPlots, onPlotClick, config, isLoading = false }: GridProps) {
  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Sort plots by row and col
  const sortedPlots = [...plots].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const renderablePlots: ExtendedPlot[] = [];
  const skipIds = new Set<string>();

  if (!isLoading) {
    // Helper to group by a key
    const groupBy = (arr: Plot[], keyFn: (p: Plot) => string) => {
      const groups: Record<string, Plot[]> = {};
      arr.forEach(p => {
        const key = keyFn(p);
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });
      return groups;
    };

    // Group owned plots by owner+purchasedAt
    const ownedPlots = sortedPlots.filter(p => p.status === 'owned');
    const ownedGroups = groupBy(ownedPlots, p => `${p.ownerId}-${p.purchasedAt}`);
    
    // selectedPlots group
    const selectedGroup = selectedPlots.map(id => sortedPlots.find(p => p.id === id)).filter(Boolean) as Plot[];
    
    const allGroups = [...Object.values(ownedGroups)];
    if (selectedGroup.length > 0) {
      allGroups.push(selectedGroup);
    }

    const mergedGroups: Plot[][] = [];

    allGroups.forEach(group => {
      if (group.length > 1) {
        const minRow = Math.min(...group.map(p => p.row));
        const maxRow = Math.max(...group.map(p => p.row));
        const minCol = Math.min(...group.map(p => p.col));
        const maxCol = Math.max(...group.map(p => p.col));
        
        const rows = maxRow - minRow + 1;
        const cols = maxCol - minCol + 1;
        
        // Check if the group perfectly fills this bounding box
        if (group.length === rows * cols) {
          mergedGroups.push(group);
        }
      }
    });

    for (const plot of sortedPlots) {
      if (skipIds.has(plot.id)) continue;
      
      const mergedGroup = mergedGroups.find(g => g.some(p => p.id === plot.id));
      
      if (mergedGroup) {
        // If this is the top-left most plot in the group, we render it
        const minRow = Math.min(...mergedGroup.map(p => p.row));
        const minCol = Math.min(...mergedGroup.map(p => p.col));
        
        if (plot.row === minRow && plot.col === minCol) {
          const maxRow = Math.max(...mergedGroup.map(p => p.row));
          const maxCol = Math.max(...mergedGroup.map(p => p.col));
          
          mergedGroup.forEach(p => {
            if (p.id !== plot.id) skipIds.add(p.id);
          });
          
          renderablePlots.push({
            ...plot,
            isMerged: true,
            colSpan: maxCol - minCol + 1,
            rowSpan: maxRow - minRow + 1,
            mergedIds: mergedGroup.map(p => p.id),
            mergedPlots: mergedGroup
          });
          continue;
        }
      }
      
      renderablePlots.push({ ...plot, isMerged: false });
    }
  }

  const skeletonCount = config.totalColumns * config.totalRows;

  return (
    <>
      <div 
        className="w-full h-full overflow-hidden bg-[#C9D7B5]"
        onMouseMove={(e) => {
          if (hoveredPlot) {
            setMousePos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        <div 
          className="grid gap-[1px] bg-[#C9D7B5] w-full h-full" 
          style={{ 
            gridTemplateColumns: `repeat(${config.totalColumns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${config.totalRows}, minmax(0, 1fr))`,
            gridAutoFlow: 'dense'
          }}
        >
          {isLoading ? (
            Array.from({ length: skeletonCount }).map((_, i) => {
              const row = Math.floor(i / config.totalColumns);
              const col = i % config.totalColumns;
              const delay = (row + col) * 0.05;
              return (
                <div 
                  key={`skeleton-${i}`} 
                  className="w-full h-full bg-[#F5F8EC] flex items-center justify-center animate-pulse"
                  style={{ animationDelay: `${delay}s`, animationDuration: '1.5s' }}
                >
                  <div className="w-4 h-1.5 bg-[#C9D7B5]/40 rounded-full"></div>
                </div>
              );
            })
          ) : (
            renderablePlots.map(plot => (
              <PlotSquare 
                key={plot.id}
                plot={plot}
                mergedPlots={plot.mergedPlots}
                isMerged={plot.isMerged}
                colSpan={plot.colSpan}
                rowSpan={plot.rowSpan}
                isSelected={selectedPlots.includes(plot.id) || (plot.mergedIds?.some(id => selectedPlots.includes(id)) || false)}
                onClick={() => onPlotClick(plot, plot.mergedPlots)}
                onMouseEnter={(e) => {
                  if (plot.status === 'owned') {
                    setHoveredPlot(plot);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => setHoveredPlot(null)}
              />
            ))
          )}
        </div>
      </div>

      {hoveredPlot && hoveredPlot.status === 'owned' && createPortal(
        <div 
          className="fixed pointer-events-none z-50 bg-[#17351F] text-[#F5F8EC] p-3 rounded shadow-xl border border-[#C9D7B5]/30 transform -translate-x-1/2 -translate-y-[calc(100%+16px)] min-w-[200px]"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#F5F8EC]/60 font-bold">
              {hoveredPlot.id} {hoveredPlot.mergedIds ? `(Merged: ${hoveredPlot.mergedIds.length} blocks)` : ''}
            </span>
            <span className="font-black tracking-wide text-sm">
              {hoveredPlot.brandName}
            </span>
            {hoveredPlot.websiteUrl && (
              <span className="text-xs text-[#C8E87A] truncate">
                {hoveredPlot.websiteUrl}
              </span>
            )}
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] font-mono">
              <span className="text-white/50">Time Left</span>
              <span className="text-white">
                {getDaysLeft(hoveredPlot.purchasedAt, config.ownershipDurationDays)} days
              </span>
            </div>
          </div>
          {/* Tooltip triangle */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#17351F]"></div>
        </div>,
        document.body
      )}
    </>
  );
}
INNER_EOF

cat << 'INNER_EOF' > src/components/PlotSquare.tsx
import { Plot } from '../types.ts';
import { cn } from '../utils.ts';

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

export default function PlotSquare({ plot, mergedPlots, isSelected, isMerged, colSpan, rowSpan, onClick, onMouseEnter, onMouseLeave }: PlotSquareProps) {
  const isOwned = plot.status === 'owned';
  const label = mergedPlots ? `${mergedPlots.length} BLOCKS` : plot.id;
  
  const style = {
    gridColumn: colSpan ? `span ${colSpan} / span ${colSpan}` : undefined,
    gridRow: rowSpan ? `span ${rowSpan} / span ${rowSpan}` : undefined,
  };

  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all duration-300 ease-out w-full h-full flex items-center justify-center overflow-visible origin-center",
        !isOwned && !isSelected && "bg-[#F5F8EC] hover:bg-white hover:z-20 hover:scale-[1.08] hover:shadow-[0_0_0_2px_#C8E87A,0_0_12px_rgba(200,232,122,0.8)]",
        !isOwned && isSelected && "bg-[#C8E87A] z-10 shadow-[0_0_0_2px_#17351F]",
        isOwned && !isSelected && "bg-white hover:z-20 hover:scale-[1.03] hover:shadow-[0_0_0_2px_#17351F,0_0_15px_rgba(23,53,31,0.2)]",
        isOwned && isSelected && "bg-white z-10 shadow-[0_0_0_2px_#C8E87A]"
      )}
      style={style}
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
              <img src={plot.logo} alt={plot.brandName || "Logo"} className={cn("object-contain mb-1 w-full h-full max-h-[80%]")} />
            )}
            {!plot.logo && plot.brandName && (
              <span className={cn(
                "leading-tight uppercase font-black text-[#17351F] text-center w-full break-words",
                isMerged ? "text-[10px] sm:text-[14px] tracking-widest" : "text-[5px] sm:text-[7px] tracking-wider"
              )}>
                {plot.brandName}
              </span>
            )}
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
INNER_EOF

chmod +x patch_grid.sh
