import type { TerritoryBounds } from "@/lib/territories";

export type SelectionType =
  | "AVAILABLE"
  | "EXACT_TERRITORY_MATCH"
  | "MIXED_SELECTION"
  | "PARTIAL_OVERLAP"
  | "MULTIPLE_OVERLAP"
  | "RESERVED"
  | "OUT_OF_BOUNDS"
  | "MAX_SIZE_EXCEEDED";

export type SelectionTerritoryStatus = "AVAILABLE" | "OWNED" | "RESERVED";

export type SelectionTerritory = TerritoryBounds & {
  id: string;
  status?: SelectionTerritoryStatus;
  currentPrice?: number;
};

export type SelectionReservation = TerritoryBounds & {
  id?: string;
};

export type ClassifySelectionInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  territories: SelectionTerritory[];
  reservations?: SelectionReservation[];
  boardSize?: number;
};

export type SelectionPriceBreakdown = {
  takeoverPrice: number;
  takeoverCellCount: number;
  emptyCellsPrice: number;
  emptyCellCount: number;
  totalPrice: number;
};

export type ClassifySelectionResult = {
  type: SelectionType;
  matchingTerritory?: SelectionTerritory;
  overlappingTerritoryIds: string[];
  message: string;
  isValidPurchase: boolean;
  purchaseType?: "claim" | "takeover" | "mixed";
  price?: number;
  priceBreakdown?: SelectionPriceBreakdown;
};
