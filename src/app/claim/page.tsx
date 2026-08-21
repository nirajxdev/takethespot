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
import { TERRITORY_SIZES } from "@/lib/pricing";

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Claim territory</CardTitle>
          <CardDescription>
            Select a size and position on the board. Payment and claiming logic
            ship in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(TERRITORY_SIZES).map(([key, size]) => (
              <div key={key} className="rounded-lg border p-4">
                <p className="font-medium capitalize">{key}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {size.width}×{size.height} — ₹{size.price}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/products/new"
            className={cn(buttonVariants())}
          >
            Create a product first
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
