"use server";

import { formatPrice } from "@/lib/cell-pricing";
import { validateCellSelection } from "@/lib/cell-selection";
import { getCellsInSelection } from "@/lib/board-data";
import {
  createCellReservation,
  releaseCellReservation,
  getActiveReservationsInSelection,
} from "@/lib/cell-reservations";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/types";
import type { CellSelectionBreakdown } from "@/types/cells";

export type CellCheckoutInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  expectedPrice?: number;
  reservationId?: string;
};

export type CellCheckoutOrderResult = {
  orderId: string;
  amount: number;
  reservationId: string;
  status: "PENDING";
  breakdown: CellSelectionBreakdown;
  priceChanged?: boolean;
};

export type CreateCellCheckoutInput = CellCheckoutInput & {
  sessionId: string;
  amount: number;
  reservationId?: string;
  productName: string;
  productDescription?: string;
  productWebsiteUrl?: string;
  productLogoUrl?: string;
};

export type FinalizeCellCheckoutInput = CreateCellCheckoutInput & {
  reservationId: string;
};

export type FinalizeCellCheckoutResult = {
  orderId: string;
  amount: number;
  purchaseId: string;
  cellsTransferred: number;
};

async function validateServerSelection(
  input: CellCheckoutInput,
  userId?: string,
): Promise<
  | { ok: true; breakdown: CellSelectionBreakdown; reservationId?: string }
  | { ok: false; error: string }
> {
  const bounds = {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  };

  const [cells, reserved] = await Promise.all([
    getCellsInSelection(bounds),
    getActiveReservationsInSelection(bounds, userId),
  ]);

  const merged = [...cells];
  for (const r of reserved) {
    const existing = merged.find((c) => c.x === r.x && c.y === r.y);
    if (existing) {
      existing.status = "RESERVED";
    } else {
      merged.push({
        x: r.x,
        y: r.y,
        productId: null,
        ownerId: null,
        currentValueInCents: 10,
        status: "RESERVED",
      });
    }
  }

  const validation = validateCellSelection(bounds, merged);
  if (!validation.isValid) {
    return { ok: false, error: validation.message };
  }

  return { ok: true, breakdown: validation.breakdown };
}

export async function checkCellSelectionAvailability(
  input: CellCheckoutInput,
): Promise<
  ActionResult<{
    available: boolean;
    reason?: string;
    updatedPrice?: number;
    breakdown?: CellSelectionBreakdown;
  }>
> {
  const result = await validateServerSelection(input);

  if (!result.ok) {
    return {
      success: true,
      data: { available: false, reason: result.error },
    };
  }

  if (
    input.expectedPrice !== undefined &&
    input.expectedPrice !== result.breakdown.totalPriceInCents
  ) {
    return {
      success: true,
      data: {
        available: true,
        updatedPrice: result.breakdown.totalPriceInCents,
        breakdown: result.breakdown,
        reason: "Some spots in your selection changed while you were checking out.",
      },
    };
  }

  return {
    success: true,
    data: { available: true, breakdown: result.breakdown },
  };
}

export async function createCellCheckoutOrder(
  input: CreateCellCheckoutInput,
): Promise<ActionResult<CellCheckoutOrderResult>> {
  const user = await requireUser();
  const result = await validateServerSelection(input, user.id);

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const serverAmount = result.breakdown.totalPriceInCents;
  const priceChanged =
    input.amount !== undefined && input.amount !== serverAmount;

  if (priceChanged) {
    return {
      success: false,
      error: `Price updated to ${formatPrice(serverAmount)}. Please review before paying.`,
    };
  }

  const reservationId =
    input.reservationId ??
    `res_${input.sessionId}_${Date.now().toString(36)}`;

  await createCellReservation({
    reservationId,
    userId: user.id,
    bounds: {
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
    },
  });

  return {
    success: true,
    data: {
      orderId: `order_${input.sessionId}`,
      amount: serverAmount,
      reservationId,
      status: "PENDING",
      breakdown: result.breakdown,
    },
  };
}

export async function finalizeCellCheckoutPurchase(
  input: FinalizeCellCheckoutInput,
): Promise<ActionResult<FinalizeCellCheckoutResult>> {
  const user = await requireUser();
  const bounds = {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  };

  const result = await validateServerSelection(input, user.id);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const serverAmount = result.breakdown.totalPriceInCents;
  if (serverAmount !== input.amount) {
    return {
      success: false,
      error: `Price updated to ${formatPrice(serverAmount)}. Please return to the board and try again.`,
    };
  }

  const orderId = `order_${input.sessionId}`;
  const purchaseType = determinePurchaseType(result.breakdown);

  try {
    const purchaseResult = await prisma.$transaction(async (tx) => {
      const slug = slugifyProductName(input.productName);
      const product = await tx.product.create({
        data: {
          userId: user.id,
          name: input.productName,
          slug: await ensureUniqueSlug(tx, slug),
          description: input.productDescription,
          websiteUrl: input.productWebsiteUrl,
          logoUrl: input.productLogoUrl,
        },
      });

      const purchase = await tx.purchase.create({
        data: {
          userId: user.id,
          productId: product.id,
          amount: serverAmount,
          type: purchaseType,
          status: "COMPLETED",
          paymentId: orderId,
        },
      });

      for (const line of result.breakdown.cells) {
        if (line.status === "reserved") {
          throw new Error(
            "Some cells in your selection are reserved by another user.",
          );
        }

        await tx.cell.upsert({
          where: { x_y: { x: line.x, y: line.y } },
          create: {
            x: line.x,
            y: line.y,
            productId: product.id,
            ownerId: user.id,
            currentValueInCents: line.newValueInCents,
            status: "OWNED",
          },
          update: {
            productId: product.id,
            ownerId: user.id,
            currentValueInCents: line.newValueInCents,
            status: "OWNED",
          },
        });

        await tx.purchaseCell.create({
          data: {
            purchaseId: purchase.id,
            cellX: line.x,
            cellY: line.y,
            previousOwnerId: line.previousOwnerId,
            previousProductId: line.previousProductId,
            previousValueInCents: line.previousValueInCents,
            purchasePriceInCents: line.purchasePriceInCents,
            newValueInCents: line.newValueInCents,
          },
        });
      }

      await tx.activity.create({
        data: {
          userId: user.id,
          productId: product.id,
          type:
            purchaseType === "TAKEOVER"
              ? "CELLS_TAKEN_OVER"
              : purchaseType === "MIXED_PURCHASE"
                ? "CELLS_PURCHASED"
                : "CELLS_PURCHASED",
          metadata: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            cells: result.breakdown.totalCells,
            amount: serverAmount,
          },
        },
      });

      return { purchaseId: purchase.id, cellsTransferred: result.breakdown.totalCells };
    });

    await releaseCellReservation(input.reservationId);

    return {
      success: true,
      data: {
        orderId,
        amount: serverAmount,
        purchaseId: purchaseResult.purchaseId,
        cellsTransferred: purchaseResult.cellsTransferred,
      },
    };
  } catch (error) {
    await releaseCellReservation(input.reservationId).catch(() => undefined);
    const message =
      error instanceof Error
        ? error.message
        : "Could not complete purchase. Please try again.";
    return { success: false, error: message };
  }
}

function determinePurchaseType(
  breakdown: CellSelectionBreakdown,
): "INITIAL_PURCHASE" | "MIXED_PURCHASE" | "TAKEOVER" {
  if (breakdown.occupiedCells === 0) return "INITIAL_PURCHASE";
  if (breakdown.availableCells === 0) return "TAKEOVER";
  return "MIXED_PURCHASE";
}

function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";
}

async function ensureUniqueSlug(
  tx: Prisma.TransactionClient,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (await tx.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
