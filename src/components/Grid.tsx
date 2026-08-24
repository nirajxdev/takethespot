import { useState, useRef, useEffect, useCallback } from 'react';
import { Plot, MarketConfig } from '../types.ts';
import PlotSquare from './PlotSquare.tsx';
import { getDaysLeft, formatCurrency } from '../utils.ts';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

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
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Zoom modes: 'fit' (entire board fits on screen), or number (1 = 100%, 1.4 = 140%, 1.8 = 180%)
  const [zoomLevel, setZoomLevel] = useState<'fit' | number>('fit');
  const [isMobile, setIsMobile] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);

  // Detect touch device and screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
      
      // Default to 'fit' on mobile & desktop initially for instant full view
      if (mobile && zoomLevel === 'fit') {
        // keep fit
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle pinch to zoom on touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoomLevel === 'fit' ? (isMobile ? 0.75 : 1) : zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newZoom = Math.min(2.2, Math.max(0.6, touchStartZoomRef.current * factor));
      setZoomLevel(Math.round(newZoom * 10) / 10);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Zoom control helpers
  const handleZoomIn = () => {
    if (zoomLevel === 'fit') {
      setZoomLevel(isMobile ? 1.25 : 1.25);
    } else {
      setZoomLevel(prev => Math.min(2.2, (typeof prev === 'number' ? prev : 1) + 0.25));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'fit') {
      // already at fit
      return;
    } else {
      const current = typeof zoomLevel === 'number' ? zoomLevel : 1;
      if (current <= 0.8) {
        setZoomLevel('fit');
      } else {
        setZoomLevel(prev => Math.max(0.6, (typeof prev === 'number' ? prev : 1) - 0.25));
      }
    }
  };

  const handleToggleFit = () => {
    if (zoomLevel === 'fit') {
      setZoomLevel(1.3);
    } else {
      setZoomLevel('fit');
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      }
    }
  };

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

  // Determine board width style based on zoomLevel
  const getBoardContainerStyle = () => {
    if (zoomLevel === 'fit') {
      return {
        width: '100%',
        minWidth: '0px',
      };
    }
    const multiplier = typeof zoomLevel === 'number' ? zoomLevel : 1;
    const baseWidth = isMobile ? 680 : 960;
    return {
      width: `${baseWidth * multiplier}px`,
      minWidth: `${baseWidth * multiplier}px`,
    };
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center relative px-1 sm:px-3 py-0 sm:py-1">
      {/* Mobile-Only Zoom / View Control Toolbar (Hidden on Laptop & Desktop) */}
      <div className="w-full max-w-[96vw] flex md:hidden items-center justify-between mb-1 px-1 select-none">
        {/* Left: Mobile Navigation Hint */}
        <div className="flex items-center gap-1 text-[9px] font-mono text-[#17351F]/70 font-bold">
          <Move size={11} className="shrink-0 text-[#17351F]/50" />
          <span>
            {zoomLevel === 'fit' ? 'FULL BOARD · TAP + TO ZOOM' : 'ZOOMED · SWIPE TO PAN'}
          </span>
        </div>

        {/* Right: Zoom Action Buttons */}
        <div className="flex items-center gap-0.5 bg-white border border-[#C9D7B5] p-0.5 rounded-sm shadow-2xs">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel === 'fit'}
            className="p-1 rounded-xs hover:bg-[#F5F8EC] text-[#17351F] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={12} />
          </button>

          <button
            type="button"
            onClick={handleToggleFit}
            className={`px-1.5 py-0.5 rounded-xs text-[8px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              zoomLevel === 'fit'
                ? 'bg-[#17351F] text-[#C8E87A]'
                : 'bg-[#F5F8EC] text-[#17351F] hover:bg-[#E2ECD2]'
            }`}
            title={zoomLevel === 'fit' ? 'Switch to Zoomed Detail' : 'Fit Entire Board to Screen'}
          >
            {zoomLevel === 'fit' ? 'FIT' : typeof zoomLevel === 'number' ? `${Math.round(zoomLevel * 100)}%` : 'FIT'}
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={typeof zoomLevel === 'number' && zoomLevel >= 2.2}
            className="p-1 rounded-xs hover:bg-[#F5F8EC] text-[#17351F] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Viewport Wrapper */}
      <div 
        ref={scrollContainerRef}
        className="w-full max-w-[96vw] xl:max-w-[1360px] 2xl:max-w-[1440px] overflow-x-auto overflow-y-hidden rounded-sm border-2 border-[#17351F] bg-white shadow-[0_8px_30px_rgba(23,53,31,0.08)] touch-pan-x"
        onScroll={() => setHasScrolled(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={(e) => {
          if (!isTouchDevice && hoveredPlot) {
            setMousePos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        <div 
          className="mx-auto flex flex-col transition-[width] duration-150 ease-out"
          style={getBoardContainerStyle()}
        >
          {/* Top Column Coordinate Header */}
          <div 
            className="grid bg-[#17351F] text-[#C8E87A] text-[7px] sm:text-[9px] md:text-[10px] font-mono font-bold py-0.5 sm:py-1 border-b border-[#17351F] select-none"
            style={{ 
              gridTemplateColumns: `20px repeat(${config.totalColumns}, minmax(0, 1fr))` 
            }}
          >
            <div className="flex items-center justify-center text-[#F5F8EC]/40 text-[6px] sm:text-[8px]">#</div>
            {colHeaders.map(num => (
              <div key={`col-head-${num}`} className="text-center font-mono leading-none py-0.5">
                {num}
              </div>
            ))}
          </div>

          {/* Grid Area with Left Row Markers */}
          <div className="flex w-full">
            {/* Row Letter Axis */}
            <div 
              className="w-5 sm:w-6.5 shrink-0 bg-[#17351F] text-[#F5F8EC]/90 text-[7px] sm:text-[10px] md:text-[11px] font-mono font-bold grid select-none border-r border-[#17351F]"
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

            {/* Main Interactive Grid */}
            <div className={`flex-1 w-full bg-[#C9D7B5] overflow-hidden ${
              zoomLevel === 'fit'
                ? 'aspect-[24/11] sm:aspect-[24/11.5] min-h-[220px] sm:min-h-[360px] md:min-h-[460px] max-h-[calc(100dvh-14rem)]'
                : 'h-[360px] sm:h-[480px] md:h-[560px]'
            }`}>
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
                        <div className="w-2 sm:w-3 h-1 bg-[#C9D7B5]/40 rounded-full" />
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
                      isFitMode={zoomLevel === 'fit' && isMobile}
                      isSelected={selectedPlots.includes(plot.id) || (plot.mergedIds?.some(id => selectedPlots.includes(id)) || false)}
                      onClick={() => onPlotClick(plot, plot.mergedPlots)}
                      onMouseEnter={(e) => {
                        if (!isTouchDevice && plot.status === 'owned') {
                          setHoveredPlot(plot);
                          setMousePos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => {
                        if (!isTouchDevice) setHoveredPlot(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Non-touch Desktop Hover Tooltip */}
      {!isTouchDevice && hoveredPlot && hoveredPlot.status === 'owned' && createPortal(
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
    </div>
  );
}

