"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createCheckoutSessionId,
  saveCheckoutState,
  type CheckoutState,
} from "@/lib/checkout";
import { getTakeoverPrice } from "@/lib/pricing";
import type { BoardTerritory } from "@/lib/mock-territories";
import type { ClassifySelectionResult } from "@/types/selection";

type SpotPanelProps = {
  territory: BoardTerritory;
  classification: ClassifySelectionResult;
  onClose: () => void;
};

type InvalidSelectionPanelProps = {
  classification: ClassifySelectionResult;
  onClose: () => void;
  onSelectAnother: () => void;
  onViewExistingSpot?: () => void;
};

function startCheckout(
  territory: BoardTerritory,
  classification: ClassifySelectionResult,
) {
  const purchaseType = classification.purchaseType ?? "claim";
  const price = classification.price ?? territory.currentPrice;

  const state: CheckoutState = {
    sessionId: createCheckoutSessionId(),
    x: territory.x,
    y: territory.y,
    width: territory.width,
    height: territory.height,
    purchaseType,
    price,
    territoryId: territory.id.startsWith("claim-") ? undefined : territory.id,
    occupiedProduct:
      purchaseType === "takeover" && territory.product
        ? {
            name: territory.product.name,
            description: territory.product.description,
            websiteUrl: territory.product.websiteUrl,
            logoUrl: territory.product.logoUrl,
            currentPrice: territory.currentPrice,
          }
        : undefined,
  };

  saveCheckoutState(state);
}

export function InvalidSelectionPanel({
  classification,
  onClose,
  onSelectAnother,
  onViewExistingSpot,
}: InvalidSelectionPanelProps) {
  const isPartial = classification.type === "PARTIAL_OVERLAP";
  const isMultiple = classification.type === "MULTIPLE_OVERLAP";

  const helperText = isPartial
    ? "You can claim available space or take over one complete spot."
    : isMultiple
      ? "You can claim available space or take over one complete spot at a time."
      : classification.message;

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border border-red-200 bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-red-600">
            Invalid selection
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {isPartial || isMultiple
              ? classification.message
              : "Selection not allowed"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">{helperText}</p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={onSelectAnother}>
            Select another area
          </Button>
          {onViewExistingSpot ? (
            <Button className="w-full" onClick={onViewExistingSpot}>
              View existing spot
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SpotPanel({
  territory,
  classification,
  onClose,
}: SpotPanelProps) {
  const router = useRouter();
  const isTakeover = classification.purchaseType === "takeover";
  const price = classification.price ?? territory.currentPrice;
  const cellCount = territory.width * territory.height;
  const takeoverPrice = isTakeover
    ? price
    : getTakeoverPrice(territory.currentPrice);

  function handleClaimOrTake() {
    startCheckout(territory, classification);
    router.push("/checkout");
  }

  if (isTakeover) {
    return (
      <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border bg-background shadow-lg">
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              This spot is owned
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {territory.product?.name ?? "Owned territory"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="text-sm text-muted-foreground">
            <p>
              Size: {territory.width} × {territory.height} ({cellCount} cells)
            </p>
            <p>Location: ({territory.x}, {territory.y})</p>
          </div>

          {territory.product?.logoUrl ? (
            <img
              src={territory.product.logoUrl}
              alt={territory.product.name}
              className="h-12 w-12 rounded-md border object-cover"
            />
          ) : null}

          {territory.product?.description ? (
            <p className="text-sm text-muted-foreground">
              {territory.product.description}
            </p>
          ) : null}

          <div className="space-y-1 text-sm">
            <p>
              Current value:{" "}
              <span className="font-semibold">₹{territory.currentPrice}</span>
            </p>
            <p>
              Take it for{" "}
              <span className="font-semibold">₹{takeoverPrice}</span>
            </p>
          </div>

          {territory.product?.websiteUrl ? (
            <Link
              href={territory.product.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Visit website
            </Link>
          ) : null}

          <Button className="w-full" onClick={handleClaimOrTake}>
            Take this spot
          </Button>

          <Link
            href="/how-it-works"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full",
            )}
          >
            How it works
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Available spot
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {territory.width} × {territory.height} Territory
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="text-sm text-muted-foreground">
          <p>
            {cellCount} cell{cellCount === 1 ? "" : "s"} · Location: (
            {territory.x}, {territory.y})
          </p>
        </div>

        <p className="text-sm">
          This spot is available. Claim it before someone else does.
        </p>
        <p className="text-sm">
          Price:{" "}
          <span className="font-semibold text-foreground">₹{price}</span>
        </p>
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Estimated logo placement area
        </div>
        <Button className="w-full" onClick={handleClaimOrTake}>
          Claim this spot
        </Button>

        <Link
          href="/how-it-works"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full",
          )}
        >
          How it works
        </Link>
      </div>
    </div>
  );
}
