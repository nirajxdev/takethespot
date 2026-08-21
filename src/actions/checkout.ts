"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { validateTerritorySelection } from "@/lib/territory-validation";
import type { ActionResult } from "@/types";

export type TerritoryAvailabilityInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  territoryId?: string;
  purchaseType: "claim" | "takeover";
  expectedPrice?: number;
};

export type CheckoutOrderResult = {
  orderId: string;
  amount: number;
  status: "PENDING";
  updatedPrice?: number;
};

export type FinalizeCheckoutInput = TerritoryAvailabilityInput & {
  sessionId: string;
  amount: number;
  productName: string;
  productDescription?: string;
  productWebsiteUrl?: string;
  productLogoUrl?: string;
};

export type FinalizeCheckoutResult = {
  orderId: string;
  amount: number;
  territoryId: string;
  purchaseType: "claim" | "takeover";
};

export async function checkTerritoryAvailability(
  input: TerritoryAvailabilityInput,
): Promise<
  ActionResult<{
    available: boolean;
    reason?: string;
    updatedPrice?: number;
  }>
> {
  const result = await validateTerritorySelection(input);

  if (!result.isValidPurchase) {
    return {
      success: true,
      data: {
        available: false,
        reason: result.message,
      },
    };
  }

  if (result.priceMismatch) {
    return {
      success: true,
      data: {
        available: true,
        updatedPrice: result.price,
        reason: result.message,
      },
    };
  }

  return { success: true, data: { available: true } };
}

export async function createCheckoutOrder(
  input: FinalizeCheckoutInput,
): Promise<ActionResult<CheckoutOrderResult>> {
  const validation = await validateTerritorySelection({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territoryId: input.territoryId,
    purchaseType: input.purchaseType,
    expectedPrice: input.amount,
  });

  if (!validation.isValidPurchase) {
    return {
      success: false,
      error: validation.message,
    };
  }

  const serverAmount = validation.price ?? input.amount;

  if (serverAmount !== input.amount) {
    return {
      success: false,
      error: `Price updated to ₹${serverAmount}. Please review before paying.`,
    };
  }

  return {
    success: true,
    data: {
      orderId: `order_${input.sessionId}`,
      amount: serverAmount,
      status: "PENDING",
    },
  };
}

export async function finalizeCheckoutPurchase(
  input: FinalizeCheckoutInput,
): Promise<ActionResult<FinalizeCheckoutResult>> {
  const user = await requireUser();

  const validation = await validateTerritorySelection({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    territoryId: input.territoryId,
    purchaseType: input.purchaseType,
    expectedPrice: input.amount,
  });

  if (!validation.isValidPurchase) {
    return {
      success: false,
      error: validation.message,
    };
  }

  const serverAmount = validation.price ?? input.amount;

  if (serverAmount !== input.amount) {
    return {
      success: false,
      error: `Price updated to ₹${serverAmount}. Please return to the board and try again.`,
    };
  }

  const orderId = `order_${input.sessionId}`;

  try {
    if (input.purchaseType === "takeover" && validation.matchingTerritory) {
      const territoryId = validation.matchingTerritory.id;

      const result = await prisma.$transaction(async (tx) => {
        const territory = await tx.territory.findUnique({
          where: { id: territoryId },
        });

        if (!territory || territory.status !== "OWNED") {
          throw new Error("This spot is no longer available for takeover.");
        }

        if (
          territory.x !== input.x ||
          territory.y !== input.y ||
          territory.width !== input.width ||
          territory.height !== input.height
        ) {
          throw new Error(
            "Territory boundaries changed. Please reselect on the board.",
          );
        }

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

        const updatedTerritory = await tx.territory.update({
          where: { id: territoryId },
          data: {
            productId: product.id,
            currentPrice: serverAmount,
            status: "OWNED",
          },
        });

        await tx.purchase.create({
          data: {
            userId: user.id,
            productId: product.id,
            territoryId: territoryId,
            amount: serverAmount,
            type: "TAKEOVER",
            status: "COMPLETED",
            paymentId: orderId,
          },
        });

        await tx.activity.create({
          data: {
            userId: user.id,
            productId: product.id,
            territoryId: territoryId,
            type: "TERRITORY_TAKEN_OVER",
            metadata: {
              previousPrice: territory.currentPrice,
              takeoverPrice: serverAmount,
            },
          },
        });

        return { territoryId: updatedTerritory.id };
      });

      return {
        success: true,
        data: {
          orderId,
          amount: serverAmount,
          territoryId: result.territoryId,
          purchaseType: "takeover",
        },
      };
    }

    if (input.purchaseType === "claim") {
      const result = await prisma.$transaction(async (tx) => {
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

        const existingTerritory = validation.matchingTerritory
          ? await tx.territory.findUnique({
              where: { id: validation.matchingTerritory.id },
            })
          : null;

        let territoryId: string;

        if (existingTerritory && existingTerritory.status === "AVAILABLE") {
          const updated = await tx.territory.update({
            where: { id: existingTerritory.id },
            data: {
              productId: product.id,
              currentPrice: serverAmount,
              status: "OWNED",
            },
          });
          territoryId = updated.id;
        } else {
          const created = await tx.territory.create({
            data: {
              productId: product.id,
              x: input.x,
              y: input.y,
              width: input.width,
              height: input.height,
              currentPrice: serverAmount,
              initialPrice: serverAmount,
              status: "OWNED",
            },
          });
          territoryId = created.id;
        }

        await tx.purchase.create({
          data: {
            userId: user.id,
            productId: product.id,
            territoryId,
            amount: serverAmount,
            type: "INITIAL_PURCHASE",
            status: "COMPLETED",
            paymentId: orderId,
          },
        });

        await tx.activity.create({
          data: {
            userId: user.id,
            productId: product.id,
            territoryId,
            type: "TERRITORY_CLAIMED",
            metadata: {
              x: input.x,
              y: input.y,
              width: input.width,
              height: input.height,
              price: serverAmount,
            },
          },
        });

        return { territoryId };
      });

      return {
        success: true,
        data: {
          orderId,
          amount: serverAmount,
          territoryId: result.territoryId,
          purchaseType: "claim",
        },
      };
    }

    return {
      success: false,
      error: "Invalid purchase type.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not complete purchase. Please try again.";
    return { success: false, error: message };
  }
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
