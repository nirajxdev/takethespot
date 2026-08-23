import { useState } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import PlotSquare from './PlotSquare.tsx';
import { getDaysLeft, formatCurrency } from '../utils.ts';
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
    const groupBy = (arr: Plot[], keyFn: (p: Plot) => string) => {
      const groups: Record<string, Plot[]> = {};
      arr.forEach(p => {
        const key = keyFn(p);
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });
      return groups;
    };

    const ownedPlots = sortedPlots.filter(p => p.status === 'owned');
    const ownedGroups = groupBy(ownedPlots, p => `${p.ownerId}-${p.purchasedAt}`);
    
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
        
        if (group.length === rows * cols) {
          mergedGroups.push(group);
        }
      }
    });

    for (const plot of sortedPlots) {
      if (skipIds.has(plot.id)) continue;
      
      const mergedGroup = mergedGroups.find(g => g.some(p => p.id === plot.id));
      
      if (mergedGroup) {
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
  const colHeaders = Array.from({ length: config.totalColumns }, (_, i) => i + 1);
  const rowHeaders = Array.from({ length: config.totalRows }, (_, i) => String.fromCharCode(65 + i));

  return (
    <>
      <div 
        className="w-full flex-1 flex flex-col items-center justify-center p-1 sm:p-2 md:p-3 overflow-x-auto"
        onMouseMove={(e) => {
          if (hoveredPlot) {
            setMousePos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        <div className="min-w-[720px] md:min-w-0 w-full max-w-[92vw] xl:max-w-[1340px] 2xl:max-w-[1420px] mx-auto border-2 border-[#17351F] bg-white shadow-[0_12px_36px_rgba(23,53,31,0.1)] rounded-sm overflow-hidden flex flex-col">
          {/* Top Column Coordinate Header */}
          <div 
            className="grid bg-[#17351F] text-[#C8E87A] text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold py-1 border-b border-[#17351F] select-none"
            style={{ 
              gridTemplateColumns: `26px repeat(${config.totalColumns}, minmax(0, 1fr))` 
            }}
          >
            <div className="flex items-center justify-center text-[#F5F8EC]/40 text-[7px] sm:text-[8px]">#</div>
            {colHeaders.map(num => (
              <div key={`col-head-${num}`} className="text-center font-mono">
                {num}
              </div>
            ))}
          </div>

          {/* Grid Area with Left Row Markers */}
          <div className="flex w-full">
            {/* Row Letter Axis */}
            <div 
              className="w-6.5 shrink-0 bg-[#17351F] text-[#F5F8EC]/90 text-[8px] sm:text-[10px] md:text-[11px] font-mono font-bold grid select-none border-r border-[#17351F]"
              style={{ 
                gridTemplateRows: `repeat(${config.totalRows}, minmax(0, 1fr))` 
              }}
            >
              {rowHeaders.map(letter => (
                <div key={`row-head-${letter}`} className="flex items-center justify-center">
                  {letter}
                </div>
              ))}
            </div>

            {/* Main Interactive Grid - Taller Block Proportions for Logos */}
            <div className="flex-1 w-full h-[58vh] sm:h-[62vh] max-h-[calc(100dvh-13rem)] min-h-[460px] sm:min-h-[520px] md:min-h-[580px] bg-[#C9D7B5] overflow-hidden">
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
                    const delay = (row + col) * 0.03;
                    return (
                      <div 
                        key={`skeleton-${i}`} 
                        className="w-full h-full bg-[#FAFDF5] flex items-center justify-center animate-pulse"
                        style={{ animationDelay: `${delay}s`, animationDuration: '1.2s' }}
                      >
                        <div className="w-3 h-1 bg-[#C9D7B5]/40 rounded-full" />
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
          </div>
        </div>
      </div>

      {hoveredPlot && hoveredPlot.status === 'owned' && createPortal(
        <div 
          className="fixed pointer-events-none z-50 bg-[#17351F] text-[#F5F8EC] p-3 rounded-sm shadow-2xl border border-[#C8E87A]/40 transform -translate-x-1/2 -translate-y-[calc(100%+14px)] min-w-[200px] max-w-[260px]"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-black uppercase tracking-wide text-sm text-white truncate">
                {hoveredPlot.brandName || 'Claimed Spot'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#C8E87A] uppercase tracking-wider">
              <span>CLAIMED · {hoveredPlot.id}</span>
              {hoveredPlot.mergedIds && (
                <span className="text-white/50">({hoveredPlot.mergedIds.length} blocks)</span>
              )}
            </div>

            {hoveredPlot.websiteUrl ? (
              <div className="mt-1 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/60 truncate max-w-[120px]">
                  {hoveredPlot.websiteUrl.replace(/^https?:\/\//, '')}
                </span>
                <span className="text-[#C8E87A] font-bold tracking-wide">
                  VISIT WEBSITE →
                </span>
              </div>
            ) : null}

            <div className="mt-1 pt-1 border-t border-white/10 flex justify-between items-center text-[9px] font-mono text-white/60">
              <span>Takeover: {formatCurrency(Math.round(hoveredPlot.currentPrice * config.takeoverMultiplier))}</span>
              <span>{getDaysLeft(hoveredPlot.purchasedAt, config.ownershipDurationDays)}d left</span>
            </div>
          </div>
          {/* Tooltip triangle */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#17351F]" />
        </div>,
        document.body
      )}
    </>
  );
}

