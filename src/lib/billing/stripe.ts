import Stripe from "stripe";
import { getRequiredEnv } from "@/lib/billing/errors";

// stripe@22.1.0 types accept 2026-04-22.dahlia, the nearest installed
// type-supported version to the requested 2026-02-25.clover.
export const STRIPE_API_VERSION = "2026-04-22.dahlia";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      typescript: true,
    });
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripeObjectId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null,
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}
