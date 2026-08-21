import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TERRITORY_SIZES, TAKEOVER_MULTIPLIER } from "@/lib/pricing";

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">How it works</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        TakeTheSpot is a competitive digital billboard. Claim visible territory
        for your product — or pay more to take someone else&apos;s spot.
      </p>

      <ol className="mt-12 space-y-10">
        <li>
          <h2 className="text-lg font-semibold">1. Explore the board</h2>
          <p className="mt-2 text-muted-foreground">
            Pan and zoom the live board. No account needed. Click any spot to see
            details — available territories show claim prices, occupied ones show
            takeover prices.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-semibold">2. Claim or take a spot</h2>
          <p className="mt-2 text-muted-foreground">
            Available spots can be claimed at the listed price. Occupied spots
            require a takeover payment — typically {TAKEOVER_MULTIPLIER}× the
            current value.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Object.entries(TERRITORY_SIZES).map(([key, size]) => (
              <div key={key} className="rounded-lg border p-4 text-sm">
                <p className="font-medium capitalize">{key}</p>
                <p className="mt-1 text-muted-foreground">
                  {size.width}×{size.height} — ₹{size.price}
                </p>
              </div>
            ))}
          </div>
        </li>
        <li>
          <h2 className="text-lg font-semibold">3. Add your product</h2>
          <p className="mt-2 text-muted-foreground">
            Enter your product name, description, website, and logo. Your
            territory displays this info on the board once active.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-semibold">4. Pay at checkout</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in only when you&apos;re ready to pay. If someone takes your
            spot during checkout, we&apos;ll let you know before you complete
            payment.
          </p>
        </li>
      </ol>

      <div className="mt-12">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
          Explore the board
        </Link>
      </div>
    </div>
  );
}
