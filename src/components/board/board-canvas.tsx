"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { BoardTerritory } from "@/lib/mock-territories";

const BOARD_SIZE = 100;
const CELL_SIZE = 10;
const BOARD_PADDING = 32;

type BoardCanvasProps = {
  territories: BoardTerritory[];
  onSelectTerritory: (territory: BoardTerritory) => void;
};

export function BoardCanvas({ territories, onSelectTerritory }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

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

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden bg-neutral-100/80"
    >
      {displaySize.width > 0 && displaySize.height > 0 ? (
        <svg
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          width={displaySize.width}
          height={displaySize.height}
          className="shrink-0 rounded-lg border-2 border-neutral-300 bg-white shadow-lg"
        >
          {Array.from({ length: Math.floor(BOARD_SIZE / 10) + 1 }).map((_, i) => {
            const pos = i * 10 * CELL_SIZE;
            return (
              <g key={`grid-${i}`}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTerritory(territory);
                }}
                className="cursor-pointer"
              >
                {isAvailable ? (
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={w + 2}
                    height={h + 2}
                    fill="oklch(0.92 0.06 145)"
                    stroke="oklch(0.65 0.14 145)"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    rx={3}
                    className="pointer-events-none"
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
                      : "oklch(0.96 0.04 145)"
                  }
                  stroke={
                    isOwned ? "oklch(0.4 0 0)" : "oklch(0.55 0.12 145)"
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
                      fill="oklch(0.45 0.12 145)"
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
                        fill="oklch(0.5 0.08 145)"
                        className="pointer-events-none select-none"
                      >
                        ₹{territory.currentPrice}
                      </text>
                    ) : (
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={8}
                        fill="oklch(0.5 0.08 145)"
                        className="pointer-events-none select-none"
                      >
                        ₹{territory.currentPrice}
                      </text>
                    )}
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}
