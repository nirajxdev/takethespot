"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTerritorySelection } from "@/lib/territory-validation";
import type { ActionResult } from "@/types";

export type CreateReservationInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  purchaseType: "claim" | "takeover";
  territoryId?: string;
};

export type ReservationResult = {
  reservationId: string;
  expiresAt: Date;
};

const RESERVATION_TTL_MS = 15 * 60 * 1000;

export async function createTerritoryReservation(
  input: CreateReservationInput,
): Promise<ActionResult<ReservationResult>> {
  const user = await requireUser();

  const validation = await validateTerritorySelection({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territoryId: input.territoryId,
    purchaseType: input.purchaseType,
  });

  if (!validation.isValidPurchase) {
    return { success: false, error: validation.message };
  }

  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

  try {
    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        expiresAt,
      },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        type: "RESERVATION_CREATED",
        metadata: {
          reservationId: reservation.id,
          x: input.x,
          y: input.y,
          width: input.width,
          height: input.height,
        },
      },
    });

    return {
      success: true,
      data: {
        reservationId: reservation.id,
        expiresAt,
      },
    };
  } catch {
    return {
      success: false,
      error: "Could not reserve this territory. It may have been taken.",
    };
  }
}

export async function claimTerritory(
  input: CreateReservationInput & {
    amount: number;
    productName: string;
  },
): Promise<ActionResult<{ territoryId: string }>> {
  const { finalizeCheckoutPurchase } = await import("@/actions/checkout");

  return finalizeCheckoutPurchase({
    sessionId: `claim_${Date.now()}`,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territoryId: input.territoryId,
    purchaseType: "claim",
    amount: input.amount,
    productName: input.productName,
  });
}

export async function takeoverTerritory(
  input: CreateReservationInput & {
    amount: number;
    productName: string;
  },
): Promise<ActionResult<{ territoryId: string }>> {
  const { finalizeCheckoutPurchase } = await import("@/actions/checkout");

  return finalizeCheckoutPurchase({
    sessionId: `takeover_${Date.now()}`,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territoryId: input.territoryId,
    purchaseType: "takeover",
    amount: input.amount,
    productName: input.productName,
  });
}
