export interface Plot {
  id: string; // e.g. "A1"
  row: number; // 0-11
  col: number; // 0-23
  status: 'available' | 'owned';
  ownerId: string | null;
  brandName: string | null;
  logo: string | null;
  websiteUrl: string | null;
  currentPrice: number; // in cents ($1.00 = 100)
  purchasedAt: string | null; // ISO date string
  expiresAt: string | null; // ISO date string
  manageToken?: string | null; // Private management token
  takeoverCount?: number;
}

export interface MarketConfig {
  totalRows: number;
  totalColumns: number;
  initialPrice: number; // in cents
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

export interface PendingCheckout {
  id: string;
  dodoSessionId?: string;
  plotIds: string[];
  itemizedPrices?: Record<string, number>;
  ownerId: string;
  brandName: string;
  logo: string;
  websiteUrl: string;
  expectedAmount: number;
  manageToken: string;
  status: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface QuoteItem {
  plotId: string;
  status: 'available' | 'owned';
  currentPrice: number;
  priceDue: number;
  brandName?: string | null;
}

export interface CheckoutQuote {
  availableCount: number;
  availableTotal: number;
  takeoverCount: number;
  takeoverTotal: number;
  totalCost: number;
  items: QuoteItem[];
}
