"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCheckoutState,
  updateCheckoutProductData,
  type CheckoutState,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CheckoutProductForm() {
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const state = getCheckoutState();
    if (!state) {
      router.replace("/");
      return;
    }
    setCheckout(state);
  }, [router]);

  if (!checkout) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading checkout…
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
    const logoUrl = String(formData.get("logoUrl") ?? "").trim();

    if (!name) {
      setError("Product name is required.");
      setIsSubmitting(false);
      return;
    }

    updateCheckoutProductData({
      name,
      description: description || undefined,
      websiteUrl: websiteUrl || undefined,
      logoUrl: logoUrl || undefined,
    });

    router.push("/checkout/payment");
    setIsSubmitting(false);
  }

  const actionLabel =
    checkout.purchaseType === "takeover" ? "Takeover" : "Claim";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Your product details
        </h1>
        <p className="mt-2 text-muted-foreground">
          {actionLabel}ing a {checkout.width}×{checkout.height} territory at (
          {checkout.x}, {checkout.y}) — {formatPrice(checkout.price)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border p-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="name">Product name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Your startup or product"
            required
            disabled={isSubmitting}
            defaultValue={checkout.productData?.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What does your product do?"
            rows={4}
            disabled={isSubmitting}
            defaultValue={checkout.productData?.description}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            placeholder="https://example.com"
            disabled={isSubmitting}
            defaultValue={checkout.productData?.websiteUrl}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            disabled={isSubmitting}
            defaultValue={checkout.productData?.logoUrl}
          />
          <p className="text-xs text-muted-foreground">
            Paste a direct image URL for your logo. File uploads ship later.
          </p>
        </div>

        {checkout.productData?.logoUrl || checkout.occupiedProduct?.logoUrl ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Logo preview will appear on your territory after payment.
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Continue to payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push("/")}
          >
            Back to board
          </Button>
        </div>
      </form>
    </div>
  );
}
