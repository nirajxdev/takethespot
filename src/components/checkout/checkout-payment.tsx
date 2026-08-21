"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createCheckoutOrder, finalizeCheckoutPurchase, checkTerritoryAvailability } from "@/actions/checkout";
import {
  clearCheckoutState,
  getCheckoutState,
  type CheckoutState,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/pricing";
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

  useEffect(() => {
    const state = getCheckoutState();
    if (!state?.productData) {
      router.replace("/checkout");
      return;
    }

    checkTerritoryAvailability({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      territoryId: state.territoryId,
      purchaseType: state.purchaseType,
      expectedPrice: state.price,
    }).then((result) => {
      if (!result.success) return;

      if (!result.data.available) {
        setError(
          result.data.reason ??
            "This spot is no longer available. Your form data is saved — pick another spot on the board.",
        );
        return;
      }

      if (
        result.data.updatedPrice !== undefined &&
        result.data.updatedPrice !== state.price
      ) {
        setError(
          `Price updated to ${formatPrice(result.data.updatedPrice)}. Return to the board to confirm before paying.`,
        );
      }
    });

    setCheckout(state);
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

    const orderResult = await createCheckoutOrder({
      sessionId: checkout.sessionId,
      x: checkout.x,
      y: checkout.y,
      width: checkout.width,
      height: checkout.height,
      territoryId: checkout.territoryId,
      purchaseType: checkout.purchaseType,
      amount: checkout.price,
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

    const finalizeResult = await finalizeCheckoutPurchase({
      sessionId: checkout.sessionId,
      x: checkout.x,
      y: checkout.y,
      width: checkout.width,
      height: checkout.height,
      territoryId: checkout.territoryId,
      purchaseType: checkout.purchaseType,
      amount: orderResult.data.amount,
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
      `Order ${orderResult.data.orderId} created for ${formatPrice(orderResult.data.amount)}. Payment integration ships in Phase 5 — your spot will activate after payment.`,
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
          {checkout.width}×{checkout.height} territory — {formatPrice(checkout.price)}
        </p>
      </div>

      <div className="space-y-6 rounded-lg border p-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
            <div className="mt-3">
              <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
                Pick another spot
              </Link>
            </div>
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
              <p className="mt-3 font-semibold">
                Total: {formatPrice(checkout.price)}
              </p>
            </div>

            {!isSignedIn ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to complete your purchase. Your territory selection and
                  product details are saved for this session.
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
                  Razorpay integration ships in Phase 5. Confirm to create a stub
                  order and verify territory availability.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handlePayment} disabled={isProcessing}>
                    {isProcessing ? "Processing…" : `Pay ${formatPrice(checkout.price)}`}
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
