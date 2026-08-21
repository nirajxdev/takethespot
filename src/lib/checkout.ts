export const CHECKOUT_STORAGE_KEY = "takethespot-checkout";

export type CheckoutPurchaseType = "claim" | "takeover";

export type CheckoutProductData = {
  name: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
};

export type CheckoutOccupiedProduct = {
  name: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
  currentPrice: number;
};

export type CheckoutState = {
  sessionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  purchaseType: CheckoutPurchaseType;
  price: number;
  territoryId?: string;
  occupiedProduct?: CheckoutOccupiedProduct;
  productData?: CheckoutProductData;
};

export function createCheckoutSessionId(): string {
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function saveCheckoutState(state: CheckoutState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state));
}

export function getCheckoutState(): CheckoutState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutState;
  } catch {
    return null;
  }
}

export function clearCheckoutState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
}

export function updateCheckoutProductData(
  productData: CheckoutProductData,
): CheckoutState | null {
  const state = getCheckoutState();
  if (!state) return null;
  const updated = { ...state, productData };
  saveCheckoutState(updated);
  return updated;
}
