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
import { formatPrice } from "@/lib/cell-pricing";
import type { BoardCell, CellSelectionBreakdown } from "@/types/cells";
import type { SelectionBounds } from "@/components/board/board-canvas";

type SelectionPanelProps = {
  bounds: SelectionBounds;
  breakdown: CellSelectionBreakdown;
  onClose: () => void;
};

type InvalidSelectionPanelProps = {
  message: string;
  errorCode: string | null;
  bounds: SelectionBounds;
  onClose: () => void;
};

type ProductInfoPanelProps = {
  cells: BoardCell[];
  onClose: () => void;
};

function startCheckout(bounds: SelectionBounds, breakdown: CellSelectionBreakdown) {
  const state: CheckoutState = {
    sessionId: createCheckoutSessionId(),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    price: breakdown.totalPriceInCents,
    breakdown: {
      width: breakdown.width,
      height: breakdown.height,
      totalCells: breakdown.totalCells,
      availableCells: breakdown.availableCells,
      occupiedCells: breakdown.occupiedCells,
      productsAffected: breakdown.productsAffected,
      availableCellsPriceInCents: breakdown.availableCellsPriceInCents,
      takeoverPriceInCents: breakdown.takeoverPriceInCents,
      totalPriceInCents: breakdown.totalPriceInCents,
    },
  };

  saveCheckoutState(state);
}

export function InvalidSelectionPanel({
  message,
  errorCode,
  bounds,
  onClose,
}: InvalidSelectionPanelProps) {
  const title =
    errorCode === "TOO_SMALL"
      ? "Selection too small"
      : errorCode === "TOO_LARGE"
        ? "Selection too large"
        : errorCode === "RESERVED"
          ? "Area reserved"
          : "Invalid selection";

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border border-red-200 bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-red-600">
            {title}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {bounds.width} × {bounds.height}
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
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Select another area
        </Button>
      </div>
    </div>
  );
}

export function SelectionPanel({
  bounds,
  breakdown,
  onClose,
}: SelectionPanelProps) {
  const router = useRouter();
  const isMixed =
    breakdown.availableCells > 0 && breakdown.occupiedCells > 0;
  const isTakeoverOnly = breakdown.occupiedCells > 0 && breakdown.availableCells === 0;

  function handleContinue() {
    startCheckout(bounds, breakdown);
    router.push("/checkout");
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Your selection
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {breakdown.width} × {breakdown.height}
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
          <p>{breakdown.totalCells} cells</p>
          <p>{breakdown.availableCells} available</p>
          {breakdown.occupiedCells > 0 ? (
            <p>
              {breakdown.occupiedCells} occupied
              {breakdown.productsAffected > 0
                ? ` · ${breakdown.productsAffected} product${breakdown.productsAffected === 1 ? "" : "s"} affected`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          {breakdown.availableCells > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available cells</span>
              <span>{formatPrice(breakdown.availableCellsPriceInCents)}</span>
            </div>
          ) : null}
          {breakdown.occupiedCells > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {isTakeoverOnly ? "Takeover cost" : "Takeover cost"}
              </span>
              <span>{formatPrice(breakdown.takeoverPriceInCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatPrice(breakdown.totalPriceInCents)}</span>
          </div>
        </div>

        {isMixed ? (
          <p className="text-xs text-muted-foreground">
            This selection includes free and occupied cells. You will take the
            spot from existing products in the selected area.
          </p>
        ) : null}

        <Button className="w-full" onClick={handleContinue}>
          Continue to checkout
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

export function ProductInfoPanel({ cells, onClose }: ProductInfoPanelProps) {
  const product = cells[0]?.product;
  if (!product) return null;

  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const cellCount = cells.length;
  const avgValue =
    cells.reduce((sum, c) => sum + c.currentValueInCents, 0) / cellCount;

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-lg border bg-background shadow-lg">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Product on board
          </p>
          <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
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
        {product.logoUrl ? (
          <img
            src={product.logoUrl}
            alt={product.name}
            className="h-12 w-12 rounded-md border object-cover"
          />
        ) : null}

        {product.description ? (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        ) : null}

        <div className="text-sm text-muted-foreground">
          <p>
            {cellCount} cell{cellCount === 1 ? "" : "s"} owned
          </p>
          <p>
            Avg. cell value:{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(Math.round(avgValue))}
            </span>
          </p>
        </div>

        {product.websiteUrl ? (
          <Link
            href={product.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Visit website
          </Link>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Drag over any part of the board to claim or take over cells — you do
          not need to select the entire product area.
        </p>
      </div>
    </div>
  );
}
