/**
 * Razorpay payment integration stub.
 * Implemented in Phase 5.
 */

export type PaymentIntent = {
  orderId: string;
  amount: number;
  currency: "USD";
};

export async function createPaymentIntent(
  amount: number,
  metadata: Record<string, string>,
): Promise<PaymentIntent> {
  void amount;
  void metadata;
  throw new Error("Payments are not implemented yet. Coming in Phase 5.");
}

export async function verifyPayment(paymentId: string): Promise<boolean> {
  void paymentId;
  throw new Error("Payments are not implemented yet. Coming in Phase 5.");
}
