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
import {
  TERRITORY_SIZES,
  type TerritorySizeKey,
} from "@/lib/pricing";

type SpotPanelProps = {
  territory: BoardTerritory;
  onClose: () => void;
  isCustomClaim?: boolean;
  onSizeChange?: (sizeKey: TerritorySizeKey) => void;
  canPlaceSize?: (sizeKey: TerritorySizeKey) => boolean;
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

const SIZE_LABELS: Record<TerritorySizeKey, string> = {
  small: "2×2",
  medium: "5×5",
  large: "10×10",
};

export function SpotPanel({
  territory,
  onClose,
  isCustomClaim = false,
  onSizeChange,
  canPlaceSize,
}: SpotPanelProps) {
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
            {isCustomClaim && onSizeChange ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Territory size
                </p>
                <div className="flex gap-2">
                  {(Object.keys(TERRITORY_SIZES) as TerritorySizeKey[]).map(
                    (sizeKey) => {
                      const fits = canPlaceSize?.(sizeKey) ?? true;
                      const isSelected = territory.sizeKey === sizeKey;
                      return (
                        <button
                          key={sizeKey}
                          type="button"
                          disabled={!fits}
                          onClick={() => onSizeChange(sizeKey)}
                          className={cn(
                            "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                            isSelected
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : fits
                                ? "border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                                : "border-neutral-100 text-neutral-300 cursor-not-allowed",
                          )}
                        >
                          {SIZE_LABELS[sizeKey]}
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            ₹{TERRITORY_SIZES[sizeKey].price}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}

            <p className="text-sm">
              This spot is available. Claim it before someone else does.
            </p>
            <p className="text-sm">
              Price:{" "}
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
