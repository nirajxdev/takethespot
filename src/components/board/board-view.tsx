"use client";

import { useState } from "react";

import { BoardCanvas, type SelectionBounds } from "@/components/board/board-canvas";
import { BoardHint } from "@/components/board/board-hint";
import {
  InvalidSelectionPanel,
  SelectionPanel,
  ProductInfoPanel,
} from "@/components/board/spot-panel";
import { UrgencyPanel } from "@/components/board/urgency-panel";
import { validateCellSelection } from "@/lib/cell-selection";
import type { BoardCell, CellSelectionBreakdown } from "@/types/cells";

type BoardViewProps = {
  cells: BoardCell[];
};

export function BoardView({ cells }: BoardViewProps) {
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(
    null,
  );
  const [breakdown, setBreakdown] = useState<CellSelectionBreakdown | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    productId: string;
    cells: BoardCell[];
  } | null>(null);

  function applySelection(bounds: SelectionBounds) {
    setSelectedProduct(null);
    const result = validateCellSelection(bounds, cells);

    setSelectionBounds(bounds);

    if (!result.isValid) {
      setBreakdown(null);
      setValidationError(result.message);
      setErrorCode(result.errorCode);
      return;
    }

    setBreakdown(result.breakdown);
    setValidationError(null);
    setErrorCode(null);
  }

  function handleSelectionComplete(bounds: SelectionBounds) {
    applySelection(bounds);
  }

  function handleSelectProduct(productId: string, productCells: BoardCell[]) {
    setSelectionBounds(null);
    setBreakdown(null);
    setValidationError(null);
    setErrorCode(null);
    setSelectedProduct({ productId, cells: productCells });
  }

  function clearSelection() {
    setSelectionBounds(null);
    setBreakdown(null);
    setValidationError(null);
    setErrorCode(null);
    setSelectedProduct(null);
  }

  const selectionOverlay =
    selectionBounds && breakdown
      ? { bounds: selectionBounds, isValid: true }
      : selectionBounds && validationError
        ? { bounds: selectionBounds, isValid: false }
        : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-200 bg-white">
        <BoardCanvas
          cells={cells}
          onSelectProduct={handleSelectProduct}
          onSelectionComplete={handleSelectionComplete}
          selectionOverlay={selectionOverlay}
        />
        <UrgencyPanel />
        <BoardHint />
        {validationError && selectionBounds ? (
          <InvalidSelectionPanel
            message={validationError}
            errorCode={errorCode}
            bounds={selectionBounds}
            onClose={clearSelection}
          />
        ) : null}
        {breakdown && selectionBounds ? (
          <SelectionPanel
            bounds={selectionBounds}
            breakdown={breakdown}
            onClose={clearSelection}
          />
        ) : null}
        {selectedProduct ? (
          <ProductInfoPanel
            cells={selectedProduct.cells}
            onClose={clearSelection}
          />
        ) : null}
      </div>
    </div>
  );
}
