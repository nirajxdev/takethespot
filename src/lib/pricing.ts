/** Price per board cell in US cents ($0.01 per cell). */
export const PRICE_PER_CELL_CENTS = 1;

/** Minimum claim price in US cents ($1.00). */
export const MIN_CLAIM_PRICE_CENTS = 100;

export const TAKEOVER_MULTIPLIER = 1.5;

export function calculateClaimPrice(width: number, height: number): number {
  const area = width * height;
  const calculated = area * PRICE_PER_CELL_CENTS;
  return Math.max(calculated, MIN_CLAIM_PRICE_CENTS);
}

export function calculateEmptyCellsPrice(emptyCellCount: number): number {
  const calculated = emptyCellCount * PRICE_PER_CELL_CENTS;
  return Math.max(calculated, MIN_CLAIM_PRICE_CENTS);
}

export function calculateTakeoverCellsPrice(
  occupiedCellCount: number,
  territoryCurrentPriceCents: number,
  territoryArea: number,
): number {
  if (occupiedCellCount >= territoryArea) {
    return getTakeoverPrice(territoryCurrentPriceCents);
  }

  return Math.ceil(
    (occupiedCellCount / territoryArea) *
      territoryCurrentPriceCents *
      TAKEOVER_MULTIPLIER,
  );
}

export function calculateMixedSelectionPrice(input: {
  emptyCells: number;
  occupiedCells: number;
  overlappingTerritory: {
    currentPrice: number;
    width: number;
    height: number;
  };
}): {
  takeoverPrice: number;
  emptyCellsPrice: number;
  total: number;
} {
  const territoryArea =
    input.overlappingTerritory.width * input.overlappingTerritory.height;
  const takeoverPrice = calculateTakeoverCellsPrice(
    input.occupiedCells,
    input.overlappingTerritory.currentPrice,
    territoryArea,
  );
  const emptyCellsPrice = calculateEmptyCellsPrice(input.emptyCells);

  return {
    takeoverPrice,
    emptyCellsPrice,
    total: takeoverPrice + emptyCellsPrice,
  };
}

export function getTakeoverPrice(currentPriceCents: number): number {
  return Math.ceil(currentPriceCents * TAKEOVER_MULTIPLIER);
}

export function formatPrice(amountInCents: number): string {
  return `$${(amountInCents / 100).toFixed(2)}`;
}
