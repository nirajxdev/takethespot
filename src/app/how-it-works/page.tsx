import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calculateClaimPrice,
  formatPrice,
  MIN_CLAIM_PRICE_CENTS,
  PRICE_PER_CELL_CENTS,
  TAKEOVER_MULTIPLIER,
} from "@/lib/pricing";

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
            Drag on empty grid space to select any rectangle of available cells,
            or click a highlighted open spot. Claims start at{" "}
            {formatPrice(MIN_CLAIM_PRICE_CENTS)} — larger territories scale at{" "}
            {formatPrice(PRICE_PER_CELL_CENTS)} per cell. Occupied spots require a
            takeover payment — typically {TAKEOVER_MULTIPLIER}× the current value.
          </p>
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-medium">Pricing examples</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                1×1 cell = {formatPrice(calculateClaimPrice(1, 1))} (minimum)
              </li>
              <li>
                5×5 territory = {formatPrice(calculateClaimPrice(5, 5))}
              </li>
              <li>
                15×15 territory = {formatPrice(calculateClaimPrice(15, 15))}
              </li>
            </ul>
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
