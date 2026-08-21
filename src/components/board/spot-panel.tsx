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
import {
  getTakeoverPriceForTerritory,
  type BoardTerritory,
} from "@/lib/mock-territories";

type SpotPanelProps = {
  territory: BoardTerritory;
  onClose: () => void;
};

function startCheckout(territory: BoardTerritory, purchaseType: "claim" | "takeover") {
  const price =
    purchaseType === "takeover"
      ? getTakeoverPriceForTerritory(territory)
      : territory.currentPrice;

  const state: CheckoutState = {
    sessionId: createCheckoutSessionId(),
    x: territory.x,
    y: territory.y,
    width: territory.width,
    height: territory.height,
    territorySizeKey: territory.sizeKey,
    purchaseType,
    price,
    territoryId: territory.id,
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

export function SpotPanel({ territory, onClose }: SpotPanelProps) {
  const router = useRouter();
  const isAvailable = territory.status === "AVAILABLE";
  const takeoverPrice = getTakeoverPriceForTerritory(territory);

  function handleClaimOrTake() {
    const purchaseType = isAvailable ? "claim" : "takeover";
    startCheckout(territory, purchaseType);
    router.push("/checkout");
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {isAvailable ? "Available spot" : "Occupied spot"}
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
          <p>Location: ({territory.x}, {territory.y})</p>
        </div>

        {isAvailable ? (
          <>
            <p className="text-sm">
              This spot is currently available. Price:{" "}
              <span className="font-semibold text-foreground">
                ₹{territory.currentPrice}
              </span>
            </p>
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              Estimated logo placement area
            </div>
            <Button className="w-full" onClick={handleClaimOrTake}>
              Claim this spot
            </Button>
          </>
        ) : (
          <>
            {territory.product?.logoUrl ? (
              <img
                src={territory.product.logoUrl}
                alt={territory.product.name}
                className="h-12 w-12 rounded-md border object-cover"
              />
            ) : null}
            <div>
              <p className="font-semibold">{territory.product?.name}</p>
              {territory.product?.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {territory.product.description}
                </p>
              ) : null}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Current value:{" "}
                <span className="font-semibold">₹{territory.currentPrice}</span>
              </p>
              <p>
                Takeover price:{" "}
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
          </>
        )}

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
