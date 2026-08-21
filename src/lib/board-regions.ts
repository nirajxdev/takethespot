import type { BoardCell } from "@/types/cells";

export type ProductRenderRegion = {
  productId: string;
  product: NonNullable<BoardCell["product"]>;
  cells: BoardCell[];
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
};

/** Group owned cells by product for efficient SVG rendering. */
export function computeProductRegions(cells: BoardCell[]): ProductRenderRegion[] {
  const byProduct = new Map<string, BoardCell[]>();

  for (const cell of cells) {
    if (!cell.productId || !cell.product || cell.status !== "OWNED") continue;
    const list = byProduct.get(cell.productId) ?? [];
    list.push(cell);
    byProduct.set(cell.productId, list);
  }

  const regions: ProductRenderRegion[] = [];

  for (const [productId, productCells] of byProduct) {
    const xs = productCells.map((c) => c.x);
    const ys = productCells.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const product = productCells[0]!.product!;

    regions.push({
      productId,
      product,
      cells: productCells,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      centroid: {
        x: (minX + maxX + 1) / 2,
        y: (minY + maxY + 1) / 2,
      },
    });
  }

  return regions;
}
