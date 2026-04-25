import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { CREDIT_PACKS } from "@/lib/billing/config";
import { BillingConfigurationError } from "@/lib/billing/errors";
import {
  findUserIdForStripeCustomer,
  getStripeCustomerIdFromSession,
  incrementProfileCredits,
  setProfilePlan,
} from "@/lib/billing/supabase";
import { getStripeClient, getStripeObjectId, getStripeWebhookSecret } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function webhookResponse(status = 200) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parseCredits(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const kind = session.metadata?.kind;
  const stripeCustomerId = getStripeCustomerIdFromSession(session.customer);

  if (!userId || !kind) {
    return;
  }

  if (kind === "subscription" && session.metadata?.plan === "pro") {
    await setProfilePlan(userId, "pro", stripeCustomerId);
    return;
  }

  if (kind === "credits") {
    if (session.payment_status !== "paid") {
      return;
    }

    const pack = session.metadata?.pack;
    const expectedCredits =
      pack && pack in CREDIT_PACKS ? CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS].credits : null;
    const credits = expectedCredits ?? parseCredits(session.metadata?.credits);

    if (!credits) {
      return;
    }

    await incrementProfileCredits(userId, credits, stripeCustomerId);
  }
}

function isSubscriptionActiveForAccess(subscription: Stripe.Subscription) {
  return ["active", "trialing"].includes(subscription.status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId = getStripeObjectId(subscription.customer);
  const userId =
    subscription.metadata?.user_id ||
    (stripeCustomerId ? await findUserIdForStripeCustomer(stripeCustomerId) : null);

  if (!userId || !stripeCustomerId) {
    return;
  }

  const activeSubscriptions = await getStripeClient().subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  });

  const hasAnotherActiveSubscription = activeSubscriptions.data.some(
    (candidate) => candidate.id !== subscription.id && isSubscriptionActiveForAccess(candidate),
  );

  if (!hasAnotherActiveSubscription) {
    await setProfilePlan(userId, "free", stripeCustomerId);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return webhookResponse(400);
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("[billing.webhook.verify]", error);
    return webhookResponse(error instanceof BillingConfigurationError ? 500 : 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }

    return webhookResponse();
  } catch (error) {
    console.error("[billing.webhook.handle]", error);
    return webhookResponse(500);
  }
}
