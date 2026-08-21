import { prisma } from "@/lib/prisma";
import {
  getMockTerritories,
  type BoardTerritory,
} from "@/lib/mock-territories";

export async function getBoardTerritories(): Promise<BoardTerritory[]> {
  try {
    const territories = await prisma.territory.findMany({
      where: {
        status: { in: ["AVAILABLE", "OWNED"] },
      },
      include: {
        product: {
          select: {
            name: true,
            description: true,
            websiteUrl: true,
            logoUrl: true,
          },
        },
      },
    });

    if (territories.length === 0) {
      return getMockTerritories();
    }

    return territories.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      currentPrice: t.currentPrice,
      status: t.status === "OWNED" ? "OWNED" : "AVAILABLE",
      product: t.product
        ? {
            name: t.product.name,
            description: t.product.description ?? undefined,
            websiteUrl: t.product.websiteUrl ?? undefined,
            logoUrl: t.product.logoUrl ?? undefined,
          }
        : undefined,
    })) satisfies BoardTerritory[];
  } catch {
    return getMockTerritories();
  }
}
