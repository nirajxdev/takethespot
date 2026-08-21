import {
  TERRITORY_SIZES,
  getTakeoverPrice,
  type TerritorySizeKey,
} from "@/lib/pricing";
import type { TerritoryBounds } from "@/lib/territories";
import type {
  ClassifySelectionInput,
  ClassifySelectionResult,
  SelectionType,
} from "@/types/selection";

export const BOARD_SIZE = 100;
export const MAX_TERRITORY_DIMENSION = 10;

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

export function inferSizeKey(
  width: number,
  height: number,
): TerritorySizeKey | undefined {
  if (width === 2 && height === 2) return "small";
  if (width === 5 && height === 5) return "medium";
  if (width === 10 && height === 10) return "large";
  return undefined;
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
      "Territory size cannot exceed 10×10 cells.",
    );
  }

  const sizeKey = inferSizeKey(width, height);
  if (!sizeKey) {
    return invalidResult(
      "MAX_SIZE_EXCEEDED",
      "Territories must be 2×2, 5×5, or 10×10.",
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

  if (overlappingTerritories.length === 0) {
    return {
      type: "AVAILABLE",
      overlappingTerritoryIds: [],
      message: "This spot is available to claim.",
      isValidPurchase: true,
      purchaseType: "claim",
      price: TERRITORY_SIZES[sizeKey].price,
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
        price:
          territory.currentPrice ?? TERRITORY_SIZES[sizeKey].price,
      };
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
