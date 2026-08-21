export const PRICE_PER_CELL = 1;

export const TAKEOVER_MULTIPLIER = 1.5;

export function calculateClaimPrice(width: number, height: number): number {
  return width * height * PRICE_PER_CELL;
}

export function getTakeoverPrice(currentPrice: number): number {
  return Math.ceil(currentPrice * TAKEOVER_MULTIPLIER);
}
