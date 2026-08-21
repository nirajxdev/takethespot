"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { formatPrice } from "@/lib/cell-pricing";
import { validateCellSelection } from "@/lib/cell-selection";
import { BOARD_SIZE } from "@/lib/cells";
import { computeProductRegions } from "@/lib/board-regions";
import type { BoardCell } from "@/types/cells";

const CELL_SIZE = 10;
const BOARD_PADDING = 4;

export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoardCanvasProps = {
  cells: BoardCell[];
  onSelectProduct: (productId: string, cells: BoardCell[]) => void;
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

function dragPreviewLabel(bounds: SelectionBounds, cells: BoardCell[]): string {
  const validation = validateCellSelection(bounds, cells);
  const cellCount = bounds.width * bounds.height;
  if (!validation.isValid) {
    return `${bounds.width}×${bounds.height} (${cellCount} cells)`;
  }
  return `${bounds.width}×${bounds.height} (${cellCount} cells) · ${formatPrice(validation.breakdown.totalPriceInCents)}`;
}

export function BoardCanvas({
  cells,
  onSelectProduct,
  onSelectionComplete,
  selectionOverlay,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const regions = useMemo(() => computeProductRegions(cells), [cells]);
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
  const activeValidation = overlayBounds
    ? validateCellSelection(overlayBounds, cells)
    : null;
  const overlayValid = activeBounds
    ? activeValidation?.isValid ?? false
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

          {cells.map((cell) => {
            if (cell.status !== "OWNED") return null;
            const x = cell.x * CELL_SIZE;
            const y = cell.y * CELL_SIZE;
            return (
              <rect
                key={`cell-${cell.x}-${cell.y}`}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill="oklch(0.9 0.01 250)"
                stroke="oklch(0.75 0 0)"
                strokeWidth={0.5}
                className="pointer-events-none"
              />
            );
          })}

          {regions.map((region) => {
            const { bounds, product, productId } = region;
            const x = bounds.x * CELL_SIZE;
            const y = bounds.y * CELL_SIZE;
            const w = bounds.width * CELL_SIZE;
            const h = bounds.height * CELL_SIZE;
            const logoSize = Math.min(w - 8, h - 8, 28);

            return (
              <g
                key={productId}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProduct(productId, region.cells);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="transparent"
                  stroke="oklch(0.4 0 0)"
                  strokeWidth={1.5}
                  rx={2}
                />
                {product.logoUrl ? (
                  <image
                    href={product.logoUrl}
                    x={x + 4}
                    y={y + 4}
                    width={logoSize}
                    height={logoSize}
                    preserveAspectRatio="xMidYMid meet"
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
                    {product.name.length > 14
                      ? `${product.name.slice(0, 13)}…`
                      : product.name}
                  </text>
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
                {dragPreviewLabel(overlayBounds, cells)}
              </text>
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
