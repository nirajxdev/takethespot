"use client";

import { useCallback, useRef, useState } from "react";

import type { BoardTerritory } from "@/lib/mock-territories";

const BOARD_SIZE = 100;
const CELL_SIZE = 8;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

type BoardCanvasProps = {
  territories: BoardTerritory[];
  onSelectTerritory: (territory: BoardTerritory) => void;
};

export function BoardCanvas({ territories, onSelectTerritory }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const boardWidth = BOARD_SIZE * CELL_SIZE;
  const boardHeight = BOARD_SIZE * CELL_SIZE;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted/20"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg
          width={boardWidth}
          height={boardHeight}
          className="rounded-lg border bg-background shadow-sm"
        >
          {/* Grid lines (subtle) */}
          {Array.from({ length: Math.floor(BOARD_SIZE / 10) + 1 }).map((_, i) => {
            const pos = i * 10 * CELL_SIZE;
            return (
              <g key={`grid-${i}`} className="text-border">
                <line
                  x1={pos}
                  y1={0}
                  x2={pos}
                  y2={boardHeight}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  opacity={0.3}
                />
                <line
                  x1={0}
                  y1={pos}
                  x2={boardWidth}
                  y2={pos}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              </g>
            );
          })}

          {territories.map((territory) => {
            const isOwned = territory.status === "OWNED";
            const x = territory.x * CELL_SIZE;
            const y = territory.y * CELL_SIZE;
            const w = territory.width * CELL_SIZE;
            const h = territory.height * CELL_SIZE;

            return (
              <g
                key={territory.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTerritory(territory);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={isOwned ? "oklch(0.85 0 0)" : "oklch(0.95 0 0)"}
                  stroke={isOwned ? "oklch(0.4 0 0)" : "oklch(0.7 0 0)"}
                  strokeWidth={1}
                  strokeDasharray={isOwned ? undefined : "4 2"}
                  rx={2}
                />
                {isOwned && territory.product ? (
                  <>
                    {territory.product.logoUrl ? (
                      <image
                        href={territory.product.logoUrl}
                        x={x + 4}
                        y={y + 4}
                        width={Math.min(w - 8, 24)}
                        height={Math.min(h - 8, 24)}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`inset(0 round 2px)`}
                      />
                    ) : null}
                    {w > 40 && h > 20 ? (
                      <text
                        x={x + 4}
                        y={y + h - 6}
                        fontSize={9}
                        fill="oklch(0.3 0 0)"
                        className="pointer-events-none select-none"
                      >
                        {territory.product.name.length > 12
                          ? `${territory.product.name.slice(0, 11)}…`
                          : territory.product.name}
                      </text>
                    ) : null}
                  </>
                ) : (
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fill="oklch(0.5 0 0)"
                    className="pointer-events-none select-none"
                  >
                    Open
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
        <span>Drag to pan</span>
        <span className="text-border">·</span>
        <span>Scroll to zoom</span>
        <span className="text-border">·</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
