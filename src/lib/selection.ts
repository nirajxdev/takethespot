import {
  calculateClaimPrice,
  calculateMixedSelectionPrice,
  getTakeoverPrice,
} from "@/lib/pricing";
import type { TerritoryBounds } from "@/lib/territories";
import type {
  ClassifySelectionInput,
  ClassifySelectionResult,
  SelectionType,
} from "@/types/selection";

export const BOARD_SIZE = 100;
export const MAX_TERRITORY_DIMENSION = 20;

export function rectanglesOverlap(
  a: TerritoryBounds,
  b: TerritoryBounds,
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isExactMatch(a: TerritoryBounds, b: TerritoryBounds): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function containsTerritory(
  selection: TerritoryBounds,
  territory: TerritoryBounds,
): boolean {
  return (
    territory.x >= selection.x &&
    territory.y >= selection.y &&
    territory.x + territory.width <= selection.x + selection.width &&
    territory.y + territory.height <= selection.y + selection.height
  );
}

function invalidResult(
  type: SelectionType,
  message: string,
  overlappingTerritoryIds: string[] = [],
): ClassifySelectionResult {
  return {
    type,
    overlappingTerritoryIds,
    message,
    isValidPurchase: false,
  };
}

export function classifySelection(
  input: ClassifySelectionInput,
): ClassifySelectionResult {
  const boardSize = input.boardSize ?? BOARD_SIZE;
  const { x, y, width, height } = input;
  const selection: TerritoryBounds = { x, y, width, height };
  const reservations = input.reservations ?? [];

  if (width <= 0 || height <= 0) {
    return invalidResult(
      "OUT_OF_BOUNDS",
      "Selection must have positive width and height.",
    );
  }

  if (
    x < 0 ||
    y < 0 ||
    x + width > boardSize ||
    y + height > boardSize
  ) {
    return invalidResult(
      "OUT_OF_BOUNDS",
      "This selection is outside the board boundaries.",
    );
  }

  if (
    width > MAX_TERRITORY_DIMENSION ||
    height > MAX_TERRITORY_DIMENSION
  ) {
    return invalidResult(
      "MAX_SIZE_EXCEEDED",
      `Territory size cannot exceed ${MAX_TERRITORY_DIMENSION}×${MAX_TERRITORY_DIMENSION} cells.`,
    );
  }

  if (reservations.some((r) => rectanglesOverlap(selection, r))) {
    return invalidResult(
      "RESERVED",
      "This area is temporarily reserved by another user.",
    );
  }

  const overlappingTerritories = input.territories.filter((t) =>
    rectanglesOverlap(selection, t),
  );
  const overlappingIds = overlappingTerritories.map((t) => t.id);

  if (overlappingTerritories.some((t) => t.status === "RESERVED")) {
    return invalidResult(
      "RESERVED",
      "This area is temporarily reserved.",
      overlappingIds,
    );
  }

  const claimPrice = calculateClaimPrice(width, height);
  const selectionArea = width * height;

  if (overlappingTerritories.length === 0) {
    return {
      type: "AVAILABLE",
      overlappingTerritoryIds: [],
      message: "This spot is available to claim.",
      isValidPurchase: true,
      purchaseType: "claim",
      price: claimPrice,
    };
  }

  if (overlappingTerritories.length === 1) {
    const territory = overlappingTerritories[0];

    if (isExactMatch(selection, territory)) {
      if (territory.status === "OWNED") {
        const currentPrice = territory.currentPrice ?? 0;
        return {
          type: "EXACT_TERRITORY_MATCH",
          matchingTerritory: territory,
          overlappingTerritoryIds: overlappingIds,
          message: "You can take over this owned spot.",
          isValidPurchase: true,
          purchaseType: "takeover",
          price: getTakeoverPrice(currentPrice),
        };
      }

      return {
        type: "AVAILABLE",
        matchingTerritory: territory,
        overlappingTerritoryIds: overlappingIds,
        message: "This spot is available to claim.",
        isValidPurchase: true,
        purchaseType: "claim",
        price: territory.currentPrice ?? claimPrice,
      };
    }

    if (
      territory.status === "OWNED" &&
      containsTerritory(selection, territory)
    ) {
      const territoryArea = territory.width * territory.height;
      const extraCells = selectionArea - territoryArea;

      if (extraCells > 0) {
        const currentPrice = territory.currentPrice ?? 0;
        const pricing = calculateMixedSelectionPrice({
          emptyCells: extraCells,
          occupiedCells: territoryArea,
          overlappingTerritory: {
            currentPrice,
            width: territory.width,
            height: territory.height,
          },
        });

        return {
          type: "MIXED_SELECTION",
          matchingTerritory: territory,
          overlappingTerritoryIds: overlappingIds,
          message: "Take over this spot and claim the extra empty cells.",
          isValidPurchase: true,
          purchaseType: "mixed",
          price: pricing.total,
          priceBreakdown: {
            takeoverPrice: pricing.takeoverPrice,
            takeoverCellCount: territoryArea,
            emptyCellsPrice: pricing.emptyCellsPrice,
            emptyCellCount: extraCells,
            totalPrice: pricing.total,
          },
        };
      }
    }

    return invalidResult(
      "PARTIAL_OVERLAP",
      "This selection overlaps an existing spot.",
      overlappingIds,
    );
  }

  return invalidResult(
    "MULTIPLE_OVERLAP",
    "This selection includes multiple owned spots.",
    overlappingIds,
  );
}
