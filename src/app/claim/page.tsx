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
import { PRICE_PER_CELL } from "@/lib/pricing";

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Claim territory</CardTitle>
          <CardDescription>
            Select any rectangle of empty cells on the board. Pricing is ₹
            {PRICE_PER_CELL} per cell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Per-cell pricing</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag to select any size — price = width × height × ₹{PRICE_PER_CELL}
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
