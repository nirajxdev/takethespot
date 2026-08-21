export const TERRITORY_SIZES = {
  small: { width: 2, height: 2, price: 99 },
  medium: { width: 5, height: 5, price: 299 },
  large: { width: 10, height: 10, price: 799 },
} as const;

export type TerritorySizeKey = keyof typeof TERRITORY_SIZES;

export const TAKEOVER_MULTIPLIER = 1.5;

export function getTerritoryPrice(size: TerritorySizeKey): number {
  return TERRITORY_SIZES[size].price;
}

export function getTakeoverPrice(currentPrice: number): number {
  return Math.ceil(currentPrice * TAKEOVER_MULTIPLIER);
}

export function getTerritoryDimensions(size: TerritorySizeKey) {
  const { width, height } = TERRITORY_SIZES[size];
  return { width, height };
}
