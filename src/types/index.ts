export type {
  Activity,
  ActivityType,
  Product,
  Purchase,
  PurchaseStatus,
  PurchaseType,
  Reservation,
  Territory,
  TerritoryStatus,
  User,
} from "@/generated/prisma/client";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
