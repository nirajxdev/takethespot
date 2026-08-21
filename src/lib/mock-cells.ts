import { BASE_CELL_PRICE_IN_CENTS } from "@/lib/cell-pricing";
import { getMockTerritories } from "@/lib/mock-territories";
import type { BoardCell } from "@/types/cells";

/** Expand legacy mock territories into per-cell ownership for dev/demo. */
export function getMockBoardCells(): BoardCell[] {
  const cells: BoardCell[] = [];

  for (const territory of getMockTerritories()) {
    if (territory.status !== "OWNED" || !territory.product) continue;

    for (let dy = 0; dy < territory.height; dy += 1) {
      for (let dx = 0; dx < territory.width; dx += 1) {
        cells.push({
          x: territory.x + dx,
          y: territory.y + dy,
          productId: territory.id,
          ownerId: "mock-owner",
          currentValueInCents: BASE_CELL_PRICE_IN_CENTS,
          status: "OWNED",
          product: {
            id: territory.id,
            name: territory.product.name,
            description: territory.product.description,
            websiteUrl: territory.product.websiteUrl,
            logoUrl: territory.product.logoUrl,
          },
        });
      }
    }
  }

  return cells;
}
