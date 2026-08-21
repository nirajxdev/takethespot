import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice, MIN_CLAIM_PRICE_CENTS, PRICE_PER_CELL_CENTS } from "@/lib/pricing";

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Claim territory</CardTitle>
          <CardDescription>
            Select any rectangle of empty cells on the board. Claims start at{" "}
            {formatPrice(MIN_CLAIM_PRICE_CENTS)}; larger territories scale at{" "}
            {formatPrice(PRICE_PER_CELL_CENTS)} per cell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            <p className="font-medium">From {formatPrice(MIN_CLAIM_PRICE_CENTS)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Small spots cost {formatPrice(MIN_CLAIM_PRICE_CENTS)} minimum. Drag
              to select any size — price = max({formatPrice(MIN_CLAIM_PRICE_CENTS)},
              width × height × {formatPrice(PRICE_PER_CELL_CENTS)}).
            </p>
          </div>
          <Link
            href="/"
            className={cn(buttonVariants())}
          >
            Go to the board
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
