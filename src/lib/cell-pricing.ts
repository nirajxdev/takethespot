import {
  buildCellMap,
  getCellAt,
  isCellAvailable,
  isCellOwned,
  isCellReserved,
  iterateSelectionCells,
} from "@/lib/cells";
import type {
  BoardCell,
  CellPriceLine,
  CellSelectionBreakdown,
  SelectionBounds,
} from "@/types/cells";

/** $0.10 per available cell */
export const BASE_CELL_PRICE_IN_CENTS = 10;

/** $1.00 minimum total purchase */
export const MINIMUM_PURCHASE_PRICE_IN_CENTS = 100;

export const TAKEOVER_MULTIPLIER = 2;

export function formatPrice(amountInCents: number): string {
  return `$${(amountInCents / 100).toFixed(2)}`;
}

export function getTakeoverPriceForCell(currentValueInCents: number): number {
  return currentValueInCents * TAKEOVER_MULTIPLIER;
}

export function priceAvailableCell(): number {
  return BASE_CELL_PRICE_IN_CENTS;
}

export function calculateSelectionPrice(
  bounds: SelectionBounds,
  cells: BoardCell[],
): CellSelectionBreakdown {
  const map = buildCellMap(cells);
  const lines: CellPriceLine[] = [];
  let availableCells = 0;
  let occupiedCells = 0;
  let reservedCells = 0;
  let availableCellsPriceInCents = 0;
  let takeoverPriceInCents = 0;
  const productIds = new Set<string>();

  for (const { x, y } of iterateSelectionCells(bounds)) {
    const cell = getCellAt(map, x, y);

    if (isCellReserved(cell)) {
      reservedCells += 1;
      lines.push({
        x,
        y,
        status: "reserved",
        previousProductId: cell?.productId ?? null,
        previousOwnerId: cell?.ownerId ?? null,
        previousValueInCents: cell?.currentValueInCents ?? null,
        purchasePriceInCents: 0,
        newValueInCents: cell?.currentValueInCents ?? BASE_CELL_PRICE_IN_CENTS,
      });
      continue;
    }

    if (isCellOwned(cell)) {
      occupiedCells += 1;
      if (cell!.productId) productIds.add(cell!.productId);
      const previousValue = cell!.currentValueInCents;
      const purchasePrice = getTakeoverPriceForCell(previousValue);
      takeoverPriceInCents += purchasePrice;
      lines.push({
        x,
        y,
        status: "occupied",
        previousProductId: cell!.productId,
        previousOwnerId: cell!.ownerId,
        previousValueInCents: previousValue,
        purchasePriceInCents: purchasePrice,
        newValueInCents: purchasePrice,
      });
      continue;
    }

    availableCells += 1;
    const purchasePrice = priceAvailableCell();
    availableCellsPriceInCents += purchasePrice;
    lines.push({
      x,
      y,
      status: "available",
      previousProductId: null,
      previousOwnerId: null,
      previousValueInCents: null,
      purchasePriceInCents: purchasePrice,
      newValueInCents: BASE_CELL_PRICE_IN_CENTS,
    });
  }

  const rawTotal = availableCellsPriceInCents + takeoverPriceInCents;
  const totalPriceInCents = Math.max(
    MINIMUM_PURCHASE_PRICE_IN_CENTS,
    rawTotal,
  );

  return {
    width: bounds.width,
    height: bounds.height,
    totalCells: bounds.width * bounds.height,
    availableCells,
    occupiedCells,
    reservedCells,
    productsAffected: productIds.size,
    availableCellsPriceInCents,
    takeoverPriceInCents,
    totalPriceInCents,
    cells: lines,
  };
}

export function hasReservedCellsInSelection(
  bounds: SelectionBounds,
  cells: BoardCell[],
): boolean {
  const map = buildCellMap(cells);
  for (const { x, y } of iterateSelectionCells(bounds)) {
    if (isCellReserved(getCellAt(map, x, y))) return true;
  }
  return false;
}
