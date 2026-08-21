#!/bin/bash
cat << 'INNEREOF' > src/components/Grid.tsx
import { useState, useEffect } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import PlotSquare from './PlotSquare.tsx';
import { getDaysLeft } from '../utils.ts';
import { createPortal } from 'react-dom';

export interface ExtendedPlot extends Plot {
  isMerged?: boolean;
  spanDirection?: 'col' | 'row';
  siblingPlot?: Plot;
}

interface GridProps {
  plots: Plot[];
  selectedPlots: string[];
  onPlotClick: (plot: Plot, siblingPlot?: Plot) => void;
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
    const getSibling = (plot: Plot) => {
      if (plot.status === 'owned') {
          return sortedPlots.find(p => p.ownerId === plot.ownerId && p.id !== plot.id && p.status === 'owned' && p.purchasedAt === plot.purchasedAt && !skipIds.has(p.id));
      }
      if (selectedPlots.includes(plot.id) && selectedPlots.length === 2) {
          const otherId = selectedPlots.find(id => id !== plot.id);
          return sortedPlots.find(p => p.id === otherId && !skipIds.has(p.id));
      }
      return null;
    };

    for (const plot of sortedPlots) {
      if (skipIds.has(plot.id)) continue;
      
      const sibling = getSibling(plot);
      if (sibling) {
          const isHorizontal = sibling.row === plot.row && Math.abs(sibling.col - plot.col) === 1;
          const isVertical = sibling.col === plot.col && Math.abs(sibling.row - plot.row) === 1;
          
          if (isHorizontal || isVertical) {
              skipIds.add(sibling.id);
              renderablePlots.push({
                  ...plot,
                  isMerged: true,
                  spanDirection: isHorizontal ? 'col' : 'row',
                  siblingPlot: sibling
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
        className="w-full h-full overflow-auto bg-[#C9D7B5]"
        onMouseMove={(e) => {
          if (hoveredPlot) {
            setMousePos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        <div 
          className="grid gap-[1px] bg-[#C9D7B5] shrink-0 m-auto" 
          style={{ 
            minWidth: '100vw',
            minHeight: '50vw',
            width: 'max(100vw, 200dvh)',
            height: 'max(50vw, 100dvh)',
            gridTemplateColumns: `repeat(${config.totalColumns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${config.totalRows}, minmax(0, 1fr))`,
            gridAutoFlow: 'dense'
          }}
        >
          {isLoading ? (
            Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`skeleton-${i}`} className="w-full h-full bg-[#F5F8EC] flex items-center justify-center">
                <div className="w-4 h-2 bg-[#C9D7B5]/30 rounded animate-pulse"></div>
              </div>
            ))
          ) : (
            renderablePlots.map(plot => (
              <PlotSquare 
                key={plot.id}
                plot={plot}
                siblingPlot={plot.siblingPlot}
                isMerged={plot.isMerged}
                spanDirection={plot.spanDirection}
                isSelected={selectedPlots.includes(plot.id) || (plot.siblingPlot ? selectedPlots.includes(plot.siblingPlot.id) : false)}
                onClick={() => onPlotClick(plot, plot.siblingPlot)}
                onMouseEnter={(e) => {
                  if (plot.status === 'owned') {
                    setHoveredPlot(plot);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredPlot(null);
                }}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Portal for tooltip to avoid overflow issues */}
      {hoveredPlot && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none mb-4 px-3 py-2 bg-[#111511] text-white text-[10px] uppercase tracking-wider shadow-xl flex flex-col items-center gap-1 transition-opacity duration-150 rounded-sm"
          style={{ 
            left: mousePos.x, 
            top: mousePos.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <span className="font-bold text-[#C8E87A]">{hoveredPlot.brandName}</span>
          <span className="text-white/70">{getDaysLeft(hoveredPlot.expiresAt)} days left</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#111511]"></div>
        </div>,
        document.body
      )}
    </>
  );
}
INNEREOF
