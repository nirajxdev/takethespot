import { prisma } from "@/lib/prisma";
import {
  getMockTerritories,
  type BoardTerritory,
} from "@/lib/mock-territories";
import type { TerritorySizeKey } from "@/lib/pricing";

function inferSizeKey(width: number, height: number): TerritorySizeKey | undefined {
  if (width === 2 && height === 2) return "small";
  if (width === 5 && height === 5) return "medium";
  if (width === 10 && height === 10) return "large";
  return undefined;
}

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
      sizeKey: inferSizeKey(t.width, t.height),
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
