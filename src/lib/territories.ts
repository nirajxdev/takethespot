import type { TerritorySizeKey } from "@/lib/pricing";
import { getTerritoryDimensions, getTerritoryPrice } from "@/lib/pricing";

export type TerritoryBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createTerritoryFromSize(
  size: TerritorySizeKey,
  position: Pick<TerritoryBounds, "x" | "y">,
) {
  const { width, height } = getTerritoryDimensions(size);
  const price = getTerritoryPrice(size);

  return {
    ...position,
    width,
    height,
    currentPrice: price,
    initialPrice: price,
  };
}

export function territoriesOverlap(
  a: TerritoryBounds,
  b: TerritoryBounds,
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

const BOARD_SIZE = 100;

export function canPlaceTerritory(
  x: number,
  y: number,
  width: number,
  height: number,
  occupied: TerritoryBounds[],
  boardSize = BOARD_SIZE,
): boolean {
  if (x < 0 || y < 0 || x + width > boardSize || y + height > boardSize) {
    return false;
  }
  const bounds = { x, y, width, height };
  return !occupied.some((t) => territoriesOverlap(bounds, t));
}

export function snapClaimPosition(
  cellX: number,
  cellY: number,
  width: number,
  height: number,
  boardSize = BOARD_SIZE,
): { x: number; y: number } {
  const x = Math.min(Math.max(0, cellX), boardSize - width);
  const y = Math.min(Math.max(0, cellY), boardSize - height);
  return { x, y };
}
