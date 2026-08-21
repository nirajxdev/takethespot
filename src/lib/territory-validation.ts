import { getMockTerritories } from "@/lib/mock-territories";
import { formatPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { classifySelection } from "@/lib/selection";
import type {
  ClassifySelectionResult,
  SelectionReservation,
  SelectionTerritory,
} from "@/types/selection";

export type TerritoryValidationContext = {
  territories: SelectionTerritory[];
  reservations: SelectionReservation[];
  fromDatabase: boolean;
};

export async function loadTerritoryValidationContext(): Promise<TerritoryValidationContext> {
  try {
    const [territories, reservations] = await Promise.all([
      prisma.territory.findMany({
        where: {
          status: { in: ["AVAILABLE", "OWNED", "RESERVED"] },
        },
        select: {
          id: true,
          x: true,
          y: true,
          width: true,
          height: true,
          currentPrice: true,
          status: true,
        },
      }),
      prisma.reservation.findMany({
        where: {
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          x: true,
          y: true,
          width: true,
          height: true,
        },
      }),
    ]);

    if (territories.length === 0) {
      const mock = getMockTerritories();
      return {
        territories: mock.map((t) => ({
          id: t.id,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          currentPrice: t.currentPrice,
          status: t.status,
        })),
        reservations: [],
        fromDatabase: false,
      };
    }

    return {
      territories: territories.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        currentPrice: t.currentPrice,
        status: t.status,
      })),
      reservations,
      fromDatabase: true,
    };
  } catch {
    const mock = getMockTerritories();
    return {
      territories: mock.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        currentPrice: t.currentPrice,
        status: t.status,
      })),
      reservations: [],
      fromDatabase: false,
    };
  }
}

export async function validateTerritorySelection(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  purchaseType: "claim" | "takeover";
  territoryId?: string;
  expectedPrice?: number;
}): Promise<ClassifySelectionResult & { priceMismatch?: boolean }> {
  const context = await loadTerritoryValidationContext();
  const result = classifySelection({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territories: context.territories,
    reservations: context.reservations,
  });

  if (!result.isValidPurchase) {
    return result;
  }

  if (result.purchaseType !== input.purchaseType) {
    const message =
      input.purchaseType === "takeover"
        ? "This spot is not available for takeover."
        : "This spot must be taken over instead of claimed.";

    return {
      ...result,
      isValidPurchase: false,
      message,
    };
  }

  if (
    input.territoryId &&
    result.matchingTerritory &&
    result.matchingTerritory.id !== input.territoryId
  ) {
    return {
      ...result,
      isValidPurchase: false,
      message: "Territory ownership has changed. Please reselect on the board.",
    };
  }

  if (
    input.purchaseType === "takeover" &&
    input.territoryId &&
    !result.matchingTerritory
  ) {
    const territory = context.territories.find((t) => t.id === input.territoryId);
    if (!territory || territory.status !== "OWNED") {
      return {
        ...result,
        isValidPurchase: false,
        message: "This spot is no longer available for takeover.",
      };
    }
  }

  if (
    input.expectedPrice !== undefined &&
    result.price !== undefined &&
    result.price !== input.expectedPrice
  ) {
    return {
      ...result,
      priceMismatch: true,
      message: `Price updated to ${formatPrice(result.price)}. Ownership or value changed.`,
    };
  }

  return result;
}
