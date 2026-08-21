"use server";

import { territoriesOverlap } from "@/lib/territories";
import { prisma } from "@/lib/prisma";
import { getMockTerritories } from "@/lib/mock-territories";
import type { ActionResult } from "@/types";

export type TerritoryAvailabilityInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  territoryId?: string;
  purchaseType: "claim" | "takeover";
};

export type CheckoutOrderResult = {
  orderId: string;
  amount: number;
  status: "PENDING";
};

export async function checkTerritoryAvailability(
  input: TerritoryAvailabilityInput,
): Promise<ActionResult<{ available: boolean; reason?: string }>> {
  const bounds = {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  };

  try {
  if (input.purchaseType === "takeover" && input.territoryId) {
    const territory = await prisma.territory.findUnique({
      where: { id: input.territoryId },
    });

    if (territory) {
      if (territory.status !== "OWNED") {
        return {
          success: true,
          data: {
            available: false,
            reason: "This spot is no longer occupied. You can claim it instead.",
          },
        };
      }
      return { success: true, data: { available: true } };
    }

    const mock = getMockTerritories().find((t) => t.id === input.territoryId);
    if (!mock || mock.status !== "OWNED") {
      return {
        success: true,
        data: {
          available: false,
          reason: "This spot is no longer available for takeover.",
        },
      };
    }
    return { success: true, data: { available: true } };
  }

  const existing = await prisma.territory.findMany({
    where: {
      status: { in: ["OWNED", "RESERVED"] },
    },
    select: { x: true, y: true, width: true, height: true },
  });

  if (existing.length > 0) {
    const overlaps = existing.some((t) => territoriesOverlap(bounds, t));
    if (overlaps) {
      return {
        success: true,
        data: {
          available: false,
          reason: "This spot was just taken. Pick another on the board.",
        },
      };
    }
    return { success: true, data: { available: true } };
  }

  const mockOverlaps = getMockTerritories()
    .some((t) => territoriesOverlap(bounds, t));

  if (mockOverlaps) {
    return {
      success: true,
      data: {
        available: false,
        reason: "This spot overlaps an existing territory.",
      },
    };
  }

  return { success: true, data: { available: true } };
  } catch {
    const mockOverlaps = getMockTerritories()
      .some((t) => territoriesOverlap(bounds, t));

    if (mockOverlaps && input.purchaseType === "claim") {
      return {
        success: true,
        data: {
          available: false,
          reason: "This spot overlaps an existing territory.",
        },
      };
    }
    return { success: true, data: { available: true } };
  }
}

export async function createCheckoutOrder(
  input: TerritoryAvailabilityInput & {
    sessionId: string;
    amount: number;
    productName: string;
  },
): Promise<ActionResult<CheckoutOrderResult>> {
  const availability = await checkTerritoryAvailability(input);

  if (!availability.success) {
    return { success: false, error: availability.error };
  }

  if (!availability.data.available) {
    return {
      success: false,
      error: availability.data.reason ?? "Territory is no longer available.",
    };
  }

  // Stub order — real payment integration in Phase 5
  return {
    success: true,
    data: {
      orderId: `order_${input.sessionId}`,
      amount: input.amount,
      status: "PENDING",
    },
  };
}
