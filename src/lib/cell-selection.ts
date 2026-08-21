import {
  hasReservedCellsInSelection,
  calculateSelectionPrice,
} from "@/lib/cell-pricing";
import { validateSelectionDimensions } from "@/lib/cells";
import type { BoardCell, CellSelectionValidation, SelectionBounds } from "@/types/cells";

export function validateCellSelection(
  bounds: SelectionBounds,
  cells: BoardCell[],
): CellSelectionValidation {
  const dimCheck = validateSelectionDimensions(bounds);
  if (!dimCheck.valid) {
    return {
      isValid: false,
      errorCode: dimCheck.errorCode,
      message: dimCheck.message,
    };
  }

  if (hasReservedCellsInSelection(bounds, cells)) {
    return {
      isValid: false,
      errorCode: "RESERVED",
      message:
        "Some cells in this selection are temporarily reserved by another user.",
    };
  }

  const breakdown = calculateSelectionPrice(bounds, cells);

  if (breakdown.reservedCells > 0) {
    return {
      isValid: false,
      errorCode: "RESERVED",
      message:
        "Some cells in this selection are temporarily reserved by another user.",
    };
  }

  return {
    isValid: true,
    breakdown,
  };
}
