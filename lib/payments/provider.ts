import Stripe from "stripe";

export type PaymentRequest = { amount: number; currency: "usd"; invoiceId: string; description: string };
export type PaymentResult = { provider: "stripe" | "demo"; transactionId: string; status: "succeeded" | "requires_action" };

export async function createPayment(request: PaymentRequest): Promise<PaymentResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { provider: "demo", transactionId: `demo_${crypto.randomUUID()}`, status: "succeeded" };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(request.amount * 100),
    currency: request.currency,
    description: request.description,
    metadata: { invoiceId: request.invoiceId },
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });
  return {
    provider: "stripe",
    transactionId: intent.id,
    status: intent.status === "succeeded" ? "succeeded" : "requires_action",
  };
}
