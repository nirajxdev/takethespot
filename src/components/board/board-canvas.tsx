"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { BoardTerritory } from "@/lib/mock-territories";
import { calculateClaimPrice, formatPrice } from "@/lib/pricing";
import { classifySelection } from "@/lib/selection";
import { BOARD_SIZE } from "@/lib/territories";
import type { SelectionTerritory } from "@/types/selection";

const CELL_SIZE = 10;
const BOARD_PADDING = 4;

export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoardCanvasProps = {
  territories: BoardTerritory[];
  onSelectTerritory: (territory: BoardTerritory) => void;
  onSelectionComplete: (bounds: SelectionBounds) => void;
  selectionOverlay?: {
    bounds: SelectionBounds;
    isValid: boolean;
  } | null;
};

type DragState = {
  startCellX: number;
  startCellY: number;
  endCellX: number;
  endCellY: number;
};

function toSelectionTerritories(
  territories: BoardTerritory[],
): SelectionTerritory[] {
  return territories.map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    currentPrice: t.currentPrice,
    status: t.status,
  }));
}

function cellFromEvent(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { cellX: number; cellY: number } | null {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const svgPoint = point.matrixTransform(ctm.inverse());
  const cellX = Math.floor(svgPoint.x / CELL_SIZE);
  const cellY = Math.floor(svgPoint.y / CELL_SIZE);

  if (
    cellX < 0 ||
    cellY < 0 ||
    cellX >= BOARD_SIZE ||
    cellY >= BOARD_SIZE
  ) {
    return null;
  }

  return { cellX, cellY };
}

function boundsFromDrag(drag: DragState): SelectionBounds {
  const x = Math.min(drag.startCellX, drag.endCellX);
  const y = Math.min(drag.startCellY, drag.endCellY);
  const width = Math.abs(drag.endCellX - drag.startCellX) + 1;
  const height = Math.abs(drag.endCellY - drag.startCellY) + 1;
  return { x, y, width, height };
}

function dragPreviewLabel(
  bounds: SelectionBounds,
  territories: SelectionTerritory[],
): string {
  const cellCount = bounds.width * bounds.height;
  const result = classifySelection({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    territories,
  });
  const price =
    result.price ?? calculateClaimPrice(bounds.width, bounds.height);
  return `${bounds.width}×${bounds.height} (${cellCount} cells) · ${formatPrice(price)}`;
}

export function BoardCanvas({
  territories,
  onSelectTerritory,
  onSelectionComplete,
  selectionOverlay,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const selectionTerritories = toSelectionTerritories(territories);
  const boardWidth = BOARD_SIZE * CELL_SIZE;
  const boardHeight = BOARD_SIZE * CELL_SIZE;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      const availW = Math.max(0, width - BOARD_PADDING * 2);
      const availH = Math.max(0, height - BOARD_PADDING * 2);
      const scale = Math.min(availW / boardWidth, availH / boardHeight);

      setDisplaySize({
        width: boardWidth * scale,
        height: boardHeight * scale,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [boardWidth, boardHeight]);

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;

    const cell = cellFromEvent(svg, event.clientX, event.clientY);
    if (!cell) return;

    svg.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setDragState({
      startCellX: cell.cellX,
      startCellY: cell.cellY,
      endCellX: cell.cellX,
      endCellY: cell.cellY,
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!isDragging || !dragState) return;
    const svg = svgRef.current;
    if (!svg) return;

    const cell = cellFromEvent(svg, event.clientX, event.clientY);
    if (!cell) return;

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            endCellX: cell.cellX,
            endCellY: cell.cellY,
          }
        : null,
    );
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!isDragging || !dragState) return;

    const svg = svgRef.current;
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    const bounds = boundsFromDrag(dragState);
    setIsDragging(false);
    setDragState(null);
    onSelectionComplete(bounds);
  }

  const activeBounds = dragState ? boundsFromDrag(dragState) : null;
  const overlayBounds = activeBounds ?? selectionOverlay?.bounds ?? null;
  const activeClassification = activeBounds
    ? classifySelection({
        x: activeBounds.x,
        y: activeBounds.y,
        width: activeBounds.width,
        height: activeBounds.height,
        territories: selectionTerritories,
      })
    : selectionOverlay?.bounds
      ? classifySelection({
          x: selectionOverlay.bounds.x,
          y: selectionOverlay.bounds.y,
          width: selectionOverlay.bounds.width,
          height: selectionOverlay.bounds.height,
          territories: selectionTerritories,
        })
      : null;
  const overlayValid = activeBounds
    ? activeClassification?.isValidPurchase ?? false
    : (selectionOverlay?.isValid ?? true);

  const overlayFill = !overlayValid
    ? "oklch(0.75 0.15 25 / 0.35)"
    : "oklch(0.85 0.12 145 / 0.35)";
  const overlayStroke = !overlayValid
    ? "oklch(0.55 0.2 25)"
    : "oklch(0.5 0.18 145)";
  const overlayTextFill = !overlayValid
    ? "oklch(0.45 0.18 25)"
    : "oklch(0.35 0.14 145)";

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden"
    >
      {displaySize.width > 0 && displaySize.height > 0 ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          width={displaySize.width}
          height={displaySize.height}
          className="shrink-0 cursor-crosshair bg-white touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {Array.from({ length: BOARD_SIZE + 1 }).map((_, i) => {
            const pos = i * CELL_SIZE;
            return (
              <g key={`cell-grid-${i}`} className="pointer-events-none">
                <line
                  x1={pos}
                  y1={0}
                  x2={pos}
                  y2={boardHeight}
                  stroke="oklch(0.94 0 0)"
                  strokeWidth={0.5}
                />
                <line
                  x1={0}
                  y1={pos}
                  x2={boardWidth}
                  y2={pos}
                  stroke="oklch(0.94 0 0)"
                  strokeWidth={0.5}
                />
              </g>
            );
          })}

          {Array.from({ length: Math.floor(BOARD_SIZE / 10) + 1 }).map((_, i) => {
            const pos = i * 10 * CELL_SIZE;
            return (
              <g key={`grid-${i}`} className="pointer-events-none">
                <line
                  x1={pos}
                  y1={0}
                  x2={pos}
                  y2={boardHeight}
                  stroke="oklch(0.85 0 0)"
                  strokeWidth={1}
                />
                <line
                  x1={0}
                  y1={pos}
                  x2={boardWidth}
                  y2={pos}
                  stroke="oklch(0.85 0 0)"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {territories.map((territory) => {
            const isOwned = territory.status === "OWNED";
            const isAvailable = territory.status === "AVAILABLE";
            const x = territory.x * CELL_SIZE;
            const y = territory.y * CELL_SIZE;
            const w = territory.width * CELL_SIZE;
            const h = territory.height * CELL_SIZE;

            return (
              <g
                key={territory.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTerritory(territory);
                }}
                className="cursor-pointer"
              >
                {isAvailable ? (
                  <rect
                    x={x - 2}
                    y={y - 2}
                    width={w + 4}
                    height={h + 4}
                    fill="oklch(0.90 0.08 145)"
                    stroke="oklch(0.55 0.18 145)"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    rx={4}
                    className="pointer-events-none animate-pulse"
                  />
                ) : null}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={
                    isOwned
                      ? "oklch(0.9 0.01 250)"
                      : "oklch(0.93 0.06 145)"
                  }
                  stroke={
                    isOwned ? "oklch(0.4 0 0)" : "oklch(0.5 0.16 145)"
                  }
                  strokeWidth={isOwned ? 1.5 : 2}
                  strokeDasharray={isOwned ? undefined : "6 4"}
                  rx={2}
                />
                {isOwned && territory.product ? (
                  <>
                    {territory.product.logoUrl ? (
                      <image
                        href={territory.product.logoUrl}
                        x={x + 4}
                        y={y + 4}
                        width={Math.min(w - 8, 28)}
                        height={Math.min(h - 8, 28)}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`inset(0 round 2px)`}
                      />
                    ) : null}
                    {w > 50 && h > 24 ? (
                      <text
                        x={x + 4}
                        y={y + h - 6}
                        fontSize={10}
                        fill="oklch(0.3 0 0)"
                        className="pointer-events-none select-none"
                      >
                        {territory.product.name.length > 14
                          ? `${territory.product.name.slice(0, 13)}…`
                          : territory.product.name}
                      </text>
                    ) : null}
                  </>
                ) : isAvailable ? (
                  <>
                    <text
                      x={x + w / 2}
                      y={y + h / 2 - (h > 30 ? 5 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={h > 30 ? 11 : 9}
                      fontWeight={600}
                      fill="oklch(0.4 0.14 145)"
                      className="pointer-events-none select-none"
                    >
                      Open
                    </text>
                    {h > 24 ? (
                      <text
                        x={x + w / 2}
                        y={y + h / 2 + 9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={9}
                        fill="oklch(0.45 0.1 145)"
                        className="pointer-events-none select-none"
                      >
                        {formatPrice(territory.currentPrice)}
                      </text>
                    ) : (
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={8}
                        fill="oklch(0.45 0.1 145)"
                        className="pointer-events-none select-none"
                      >
                        {formatPrice(territory.currentPrice)}
                      </text>
                    )}
                  </>
                ) : null}
              </g>
            );
          })}

          {overlayBounds ? (
            <g className="pointer-events-none">
              <rect
                x={overlayBounds.x * CELL_SIZE}
                y={overlayBounds.y * CELL_SIZE}
                width={overlayBounds.width * CELL_SIZE}
                height={overlayBounds.height * CELL_SIZE}
                fill={overlayFill}
                stroke={overlayStroke}
                strokeWidth={2}
                strokeDasharray={overlayValid ? undefined : "6 4"}
                rx={2}
              />
              <text
                x={
                  overlayBounds.x * CELL_SIZE +
                  (overlayBounds.width * CELL_SIZE) / 2
                }
                y={
                  overlayBounds.y * CELL_SIZE +
                  (overlayBounds.height * CELL_SIZE) / 2
                }
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={600}
                fill={overlayTextFill}
                className="select-none"
              >
                {dragPreviewLabel(overlayBounds, selectionTerritories)}
              </text>
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
