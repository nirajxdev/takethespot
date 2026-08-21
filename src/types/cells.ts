export type CellStatus = "AVAILABLE" | "OWNED" | "RESERVED";

/** Logical board cell — sparse storage; missing cells are AVAILABLE. */
export type BoardCell = {
  x: number;
  y: number;
  productId: string | null;
  ownerId: string | null;
  currentValueInCents: number;
  status: CellStatus;
  product?: {
    id: string;
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
  };
};

export type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CellSelectionBreakdown = {
  width: number;
  height: number;
  totalCells: number;
  availableCells: number;
  occupiedCells: number;
  reservedCells: number;
  productsAffected: number;
  availableCellsPriceInCents: number;
  takeoverPriceInCents: number;
  totalPriceInCents: number;
  /** Per-cell pricing for server audit */
  cells: CellPriceLine[];
};

export type CellPriceLine = {
  x: number;
  y: number;
  status: "available" | "occupied" | "reserved";
  previousProductId: string | null;
  previousOwnerId: string | null;
  previousValueInCents: number | null;
  purchasePriceInCents: number;
  newValueInCents: number;
};

export type CellSelectionValidation =
  | {
      isValid: true;
      breakdown: CellSelectionBreakdown;
    }
  | {
      isValid: false;
      errorCode:
        | "OUT_OF_BOUNDS"
        | "TOO_SMALL"
        | "TOO_LARGE"
        | "RESERVED"
        | "INVALID";
      message: string;
    };
