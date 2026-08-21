/**
 * @deprecated Use cell-pricing.ts constants. Re-exported for gradual migration.
 */
export {
  BASE_CELL_PRICE_IN_CENTS as PRICE_PER_CELL_CENTS,
  MINIMUM_PURCHASE_PRICE_IN_CENTS as MIN_CLAIM_PRICE_CENTS,
  TAKEOVER_MULTIPLIER,
  formatPrice,
  getTakeoverPriceForCell as getTakeoverPrice,
  calculateSelectionPrice,
} from "@/lib/cell-pricing";

import { BASE_CELL_PRICE_IN_CENTS, MINIMUM_PURCHASE_PRICE_IN_CENTS } from "@/lib/cell-pricing";

/** @deprecated Use calculateSelectionPrice with cell data */
export function calculateClaimPrice(width: number, height: number): number {
  const calculated = width * height * BASE_CELL_PRICE_IN_CENTS;
  return Math.max(calculated, MINIMUM_PURCHASE_PRICE_IN_CENTS);
}
