import { describe, expect, it } from "vitest";

import {
  BASE_CELL_PRICE_IN_CENTS,
  MINIMUM_PURCHASE_PRICE_IN_CENTS,
  calculateSelectionPrice,
  getTakeoverPriceForCell,
} from "@/lib/cell-pricing";
import { validateSelectionDimensions } from "@/lib/cells";
import { validateCellSelection } from "@/lib/cell-selection";
import type { BoardCell } from "@/types/cells";

function ownedCell(
  x: number,
  y: number,
  productId: string,
  value = BASE_CELL_PRICE_IN_CENTS,
): BoardCell {
  return {
    x,
    y,
    productId,
    ownerId: "user-1",
    currentValueInCents: value,
    status: "OWNED",
  };
}

describe("selection dimensions", () => {
  it("rejects 1×1", () => {
    const result = validateSelectionDimensions({ x: 0, y: 0, width: 1, height: 1 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorCode).toBe("TOO_SMALL");
  });

  it("rejects 1×5", () => {
    const result = validateSelectionDimensions({ x: 0, y: 0, width: 1, height: 5 });
    expect(result.valid).toBe(false);
  });

  it("accepts 2×2", () => {
    expect(validateSelectionDimensions({ x: 0, y: 0, width: 2, height: 2 }).valid).toBe(true);
  });

  it("accepts 20×20", () => {
    expect(validateSelectionDimensions({ x: 0, y: 0, width: 20, height: 20 }).valid).toBe(true);
  });

  it("rejects 21×20", () => {
    const result = validateSelectionDimensions({ x: 0, y: 0, width: 21, height: 20 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorCode).toBe("TOO_LARGE");
  });

  it("rejects 20×21", () => {
    const result = validateSelectionDimensions({ x: 0, y: 0, width: 20, height: 21 });
    expect(result.valid).toBe(false);
  });
});

describe("empty selection pricing", () => {
  it("2×2 empty = $1 minimum", () => {
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 2, height: 2 }, []);
    expect(breakdown.totalPriceInCents).toBe(100);
    expect(breakdown.availableCells).toBe(4);
    expect(breakdown.occupiedCells).toBe(0);
  });

  it("3×3 empty = $1 minimum when raw below $1", () => {
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 3, height: 3 }, []);
    expect(9 * BASE_CELL_PRICE_IN_CENTS).toBe(90);
    expect(breakdown.totalPriceInCents).toBe(MINIMUM_PURCHASE_PRICE_IN_CENTS);
  });

  it("5×5 empty = $2.50", () => {
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 5, height: 5 }, []);
    expect(breakdown.totalPriceInCents).toBe(250);
  });

  it("10×10 empty = $10", () => {
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 10, height: 10 }, []);
    expect(breakdown.totalPriceInCents).toBe(1000);
  });

  it("20×20 empty = $40", () => {
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 20, height: 20 }, []);
    expect(breakdown.totalPriceInCents).toBe(4000);
  });
});

describe("takeover pricing", () => {
  it("$0.10 cell becomes $0.20", () => {
    expect(getTakeoverPriceForCell(10)).toBe(20);
  });

  it("$0.20 cell becomes $0.40", () => {
    expect(getTakeoverPriceForCell(20)).toBe(40);
  });

  it("calculates occupied cells independently", () => {
    const cells = [
      ownedCell(0, 0, "a", 10),
      ownedCell(1, 0, "b", 40),
    ];
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 2, height: 1 }, cells);
    expect(breakdown.takeoverPriceInCents).toBe(20 + 80);
    expect(breakdown.totalPriceInCents).toBe(100);
  });
});

describe("mixed selection pricing", () => {
  it("free + occupied with different values", () => {
    const cells = [
      ownedCell(0, 0, "a", 20),
      ownedCell(1, 0, "a", 20),
      ownedCell(2, 0, "b", 10),
    ];
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 5, height: 1 }, cells);
    // 2 available at 10 + 3 occupied: 40+40+20 = 100 takeover + 20 available = 120
    expect(breakdown.availableCells).toBe(2);
    expect(breakdown.occupiedCells).toBe(3);
    expect(breakdown.availableCellsPriceInCents).toBe(20);
    expect(breakdown.takeoverPriceInCents).toBe(100);
    expect(breakdown.totalPriceInCents).toBe(120);
    expect(breakdown.productsAffected).toBe(2);
  });

  it("5×5 mixed example from spec", () => {
    const cells: BoardCell[] = [];
    // 10 occupied cells in bottom-right portion of 5×5 grid
    for (let y = 3; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        cells.push(ownedCell(x, y, "p1", 20));
      }
    }
    const breakdown = calculateSelectionPrice({ x: 0, y: 0, width: 5, height: 5 }, cells);
    expect(breakdown.availableCells).toBe(15);
    expect(breakdown.occupiedCells).toBe(10);
    expect(breakdown.availableCellsPriceInCents).toBe(150);
    expect(breakdown.takeoverPriceInCents).toBe(400);
    expect(breakdown.totalPriceInCents).toBe(550);
  });
});

describe("validateCellSelection", () => {
  it("allows mixed ownership selection", () => {
    const cells = [ownedCell(0, 0, "a"), ownedCell(1, 0, "b")];
    const result = validateCellSelection({ x: 0, y: 0, width: 3, height: 2 }, cells);
    expect(result.isValid).toBe(true);
  });

  it("rejects reserved cells", () => {
    const cells: BoardCell[] = [
      {
        x: 0,
        y: 0,
        productId: null,
        ownerId: null,
        currentValueInCents: 10,
        status: "RESERVED",
      },
    ];
    const result = validateCellSelection({ x: 0, y: 0, width: 2, height: 2 }, cells);
    expect(result.isValid).toBe(false);
    if (!result.isValid) expect(result.errorCode).toBe("RESERVED");
  });
});
