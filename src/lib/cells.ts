import type { BoardCell, SelectionBounds } from "@/types/cells";

export const BOARD_SIZE = 100;
export const MIN_SELECTION_DIMENSION = 2;
export const MAX_SELECTION_DIMENSION = 20;

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

/** Iterate every cell coordinate in a rectangular selection. */
export function* iterateSelectionCells(bounds: SelectionBounds): Generator<{
  x: number;
  y: number;
}> {
  for (let dy = 0; dy < bounds.height; dy += 1) {
    for (let dx = 0; dx < bounds.width; dx += 1) {
      yield { x: bounds.x + dx, y: bounds.y + dy };
    }
  }
}

export function getSelectionCellCoords(bounds: SelectionBounds): Array<{
  x: number;
  y: number;
}> {
  return Array.from(iterateSelectionCells(bounds));
}

export function buildCellMap(cells: BoardCell[]): Map<string, BoardCell> {
  const map = new Map<string, BoardCell>();
  for (const cell of cells) {
    map.set(cellKey(cell.x, cell.y), cell);
  }
  return map;
}

export function getCellAt(
  map: Map<string, BoardCell>,
  x: number,
  y: number,
): BoardCell | null {
  return map.get(cellKey(x, y)) ?? null;
}

export function isCellAvailable(cell: BoardCell | null): boolean {
  if (!cell) return true;
  return cell.status === "AVAILABLE" || (!cell.productId && !cell.ownerId);
}

export function isCellReserved(cell: BoardCell | null): boolean {
  return cell?.status === "RESERVED";
}

export function isCellOwned(cell: BoardCell | null): boolean {
  if (!cell) return false;
  return cell.status === "OWNED" && !!cell.productId;
}

export function validateSelectionDimensions(
  bounds: SelectionBounds,
  boardSize = BOARD_SIZE,
):
  | { valid: true }
  | { valid: false; errorCode: "OUT_OF_BOUNDS" | "TOO_SMALL" | "TOO_LARGE"; message: string } {
  const { x, y, width, height } = bounds;

  if (width < MIN_SELECTION_DIMENSION || height < MIN_SELECTION_DIMENSION) {
    return {
      valid: false,
      errorCode: "TOO_SMALL",
      message: `Selection must be at least ${MIN_SELECTION_DIMENSION}×${MIN_SELECTION_DIMENSION} cells.`,
    };
  }

  if (width > MAX_SELECTION_DIMENSION || height > MAX_SELECTION_DIMENSION) {
    return {
      valid: false,
      errorCode: "TOO_LARGE",
      message: `Selection cannot exceed ${MAX_SELECTION_DIMENSION}×${MAX_SELECTION_DIMENSION} cells.`,
    };
  }

  if (x < 0 || y < 0 || x + width > boardSize || y + height > boardSize) {
    return {
      valid: false,
      errorCode: "OUT_OF_BOUNDS",
      message: "This selection is outside the board boundaries.",
    };
  }

  return { valid: true };
}

/** Group owned cells by product for efficient rendering. */
export function groupCellsByProduct(
  cells: BoardCell[],
): Map<string, BoardCell[]> {
  const groups = new Map<string, BoardCell[]>();
  for (const cell of cells) {
    if (!cell.productId) continue;
    const list = groups.get(cell.productId) ?? [];
    list.push(cell);
    groups.set(cell.productId, list);
  }
  return groups;
}
