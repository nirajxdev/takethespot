"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCellCheckoutOrder,
  finalizeCellCheckoutPurchase,
  checkCellSelectionAvailability,
} from "@/actions/cell-checkout";
import {
  clearCheckoutState,
  getCheckoutState,
  saveCheckoutState,
  type CheckoutState,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/cell-pricing";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CheckoutPayment() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);

  useEffect(() => {
    const state = getCheckoutState();
    if (!state?.productData) {
      router.replace("/checkout");
      return;
    }

    checkCellSelectionAvailability({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      expectedPrice: state.price,
      reservationId: state.reservationId,
    }).then((result) => {
      if (!result.success) return;

      if (!result.data.available) {
        setError(
          result.data.reason ??
            "This selection is no longer available. Pick another area on the board.",
        );
        return;
      }

      if (
        result.data.updatedPrice !== undefined &&
        result.data.updatedPrice !== state.price &&
        result.data.breakdown
      ) {
        setPriceChanged(true);
        const updated: CheckoutState = {
          ...state,
          price: result.data.updatedPrice,
          breakdown: {
            ...state.breakdown,
            totalPriceInCents: result.data.updatedPrice,
            availableCells: result.data.breakdown.availableCells,
            occupiedCells: result.data.breakdown.occupiedCells,
            productsAffected: result.data.breakdown.productsAffected,
            availableCellsPriceInCents:
              result.data.breakdown.availableCellsPriceInCents,
            takeoverPriceInCents: result.data.breakdown.takeoverPriceInCents,
          },
        };
        saveCheckoutState(updated);
        setCheckout(updated);
        setError(
          "Some spots in your selection changed while you were checking out. Review the updated price before paying.",
        );
        return;
      }

      setCheckout(state);
    });
  }, [router]);

  if (!isLoaded || !checkout) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading payment…
      </div>
    );
  }

  async function handlePayment() {
    if (!checkout?.productData) return;
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    const orderResult = await createCellCheckoutOrder({
      sessionId: checkout.sessionId,
      x: checkout.x,
      y: checkout.y,
      width: checkout.width,
      height: checkout.height,
      amount: checkout.price,
      expectedPrice: checkout.price,
      reservationId: checkout.reservationId,
      productName: checkout.productData.name,
      productDescription: checkout.productData.description,
      productWebsiteUrl: checkout.productData.websiteUrl,
      productLogoUrl: checkout.productData.logoUrl,
    });

    if (!orderResult.success) {
      setError(orderResult.error);
      setIsProcessing(false);
      return;
    }

    const updatedCheckout = {
      ...checkout,
      price: orderResult.data.amount,
      reservationId: orderResult.data.reservationId,
    };
    saveCheckoutState(updatedCheckout);
    setCheckout(updatedCheckout);

    const finalizeResult = await finalizeCellCheckoutPurchase({
      sessionId: checkout.sessionId,
      x: checkout.x,
      y: checkout.y,
      width: checkout.width,
      height: checkout.height,
      amount: orderResult.data.amount,
      reservationId: orderResult.data.reservationId,
      productName: checkout.productData.name,
      productDescription: checkout.productData.description,
      productWebsiteUrl: checkout.productData.websiteUrl,
      productLogoUrl: checkout.productData.logoUrl,
    });

    setIsProcessing(false);

    if (!finalizeResult.success) {
      setError(finalizeResult.error);
      return;
    }

    clearCheckoutState();
    setSuccess(
      `Purchase complete — ${finalizeResult.data.cellsTransferred} cells transferred for ${formatPrice(finalizeResult.data.amount)}.`,
    );
  }

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent("/checkout/payment")}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Step 2 of 2
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Payment</h1>
        <p className="mt-2 text-muted-foreground">
          {checkout.width}×{checkout.height} selection —{" "}
          {formatPrice(checkout.price)}
        </p>
      </div>

      <div className="space-y-6 rounded-lg border p-6">
        {error ? (
          <Alert variant={priceChanged ? "default" : "destructive"}>
            <AlertDescription>{error}</AlertDescription>
            {!priceChanged ? (
              <div className="mt-3">
                <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
                  Pick another area
                </Link>
              </div>
            ) : null}
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
            <div className="mt-3 flex gap-2">
              <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
                Back to board
              </Link>
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Dashboard
                </Link>
              ) : null}
            </div>
          </Alert>
        ) : null}

        {!success ? (
          <>
            <div className="rounded-md bg-muted/50 p-4 text-sm">
              <p className="font-medium">{checkout.productData?.name}</p>
              {checkout.productData?.description ? (
                <p className="mt-1 text-muted-foreground">
                  {checkout.productData.description}
                </p>
              ) : null}
              <div className="mt-3 space-y-1">
                {checkout.breakdown.availableCells > 0 ? (
                  <div className="flex justify-between">
                    <span>Available cells</span>
                    <span>
                      {formatPrice(checkout.breakdown.availableCellsPriceInCents)}
                    </span>
                  </div>
                ) : null}
                {checkout.breakdown.occupiedCells > 0 ? (
                  <div className="flex justify-between">
                    <span>Takeover cost</span>
                    <span>
                      {formatPrice(checkout.breakdown.takeoverPriceInCents)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(checkout.price)}</span>
                </div>
              </div>
            </div>

            {!isSignedIn ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to complete your purchase. Your selection and product
                  details are saved for this session.
                </p>
                <div className="flex gap-3">
                  <Link href={signInUrl} className={cn(buttonVariants())}>
                    Sign in to pay
                  </Link>
                  <Link
                    href="/sign-up?redirect_url=%2Fcheckout%2Fpayment"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Payment integration ships in a later phase. Confirm to verify
                  selection and transfer cell ownership.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handlePayment} disabled={isProcessing}>
                    {isProcessing
                      ? "Processing…"
                      : `Pay ${formatPrice(checkout.price)}`}
                  </Button>
                  <Link
                    href="/checkout"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Edit details
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
