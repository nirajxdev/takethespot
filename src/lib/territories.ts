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
