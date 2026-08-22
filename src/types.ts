export interface Plot {
  id: string; // e.g. "A1"
  row: number; // 0-9
  col: number; // 0-9
  status: 'available' | 'owned';
  ownerId: string | null;
  brandName: string | null;
  logo: string | null;
  websiteUrl: string | null;
  currentPrice: number; // in cents
  purchasedAt: string | null; // ISO date string
  expiresAt: string | null; // ISO date string
}

export interface MarketConfig {
  totalRows: number;
  totalColumns: number;
  initialPrice: number;
  maxInitialPlotsPerUser: number;
  ownershipDurationDays: number;
  takeoverMultiplier: number;
}

export interface Transaction {
  id: string;
  plotId: string;
  previousOwner: string | null;
  newOwner: string;
  previousPrice: number;
  newPrice: number;
  transactionAmount: number;
  platformFee: number;
  timestamp: string;
}

export interface PurchaseRequest {
  plotIds: string[];
  ownerId: string;
  brandName: string;
  logo: string;
  websiteUrl: string;
}

export type CheckoutStatus = "pending" | "completed" | "failed";

export interface PendingCheckout {
  id: string;
  dodoSessionId: string | null;
  plotIds: string[];
  ownerId: string;
  brandName: string;
  logo: string;
  websiteUrl: string;
  expectedAmount: number;
  status: CheckoutStatus;
  paymentId?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}
