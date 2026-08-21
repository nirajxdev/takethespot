import { prisma } from "@/lib/prisma";
import { getMockBoardCells } from "@/lib/mock-cells";
import type { BoardCell } from "@/types/cells";

export async function getBoardCells(): Promise<BoardCell[]> {
  try {
    const cells = await prisma.cell.findMany({
      where: {
        status: { in: ["OWNED", "RESERVED"] },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            websiteUrl: true,
            logoUrl: true,
          },
        },
      },
    });

    if (cells.length === 0) {
      const legacyTerritories = await prisma.territory.findMany({
        where: { status: "OWNED" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              websiteUrl: true,
              logoUrl: true,
            },
          },
        },
      });

      if (legacyTerritories.length === 0) {
        return getMockBoardCells();
      }

      return legacyTerritories.flatMap((t) => {
        const product = t.product
          ? {
              id: t.product.id,
              name: t.product.name,
              description: t.product.description ?? undefined,
              websiteUrl: t.product.websiteUrl ?? undefined,
              logoUrl: t.product.logoUrl ?? undefined,
            }
          : undefined;

        const result: BoardCell[] = [];
        for (let dy = 0; dy < t.height; dy += 1) {
          for (let dx = 0; dx < t.width; dx += 1) {
            result.push({
              x: t.x + dx,
              y: t.y + dy,
              productId: t.productId,
              ownerId: null,
              currentValueInCents: t.currentPrice,
              status: "OWNED",
              product,
            });
          }
        }
        return result;
      });
    }

    return cells.map((c) => ({
      x: c.x,
      y: c.y,
      productId: c.productId,
      ownerId: c.ownerId,
      currentValueInCents: c.currentValueInCents,
      status: c.status,
      product: c.product
        ? {
            id: c.product.id,
            name: c.product.name,
            description: c.product.description ?? undefined,
            websiteUrl: c.product.websiteUrl ?? undefined,
            logoUrl: c.product.logoUrl ?? undefined,
          }
        : undefined,
    }));
  } catch {
    return getMockBoardCells();
  }
}

export async function getCellsInSelection(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<BoardCell[]> {
  const all = await getBoardCells();
  const maxX = bounds.x + bounds.width;
  const maxY = bounds.y + bounds.height;

  return all.filter(
    (c) => c.x >= bounds.x && c.x < maxX && c.y >= bounds.y && c.y < maxY,
  );
}
