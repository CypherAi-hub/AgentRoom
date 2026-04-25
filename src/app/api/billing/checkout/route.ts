import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PACKS, PRO_PLAN, parseCheckoutInput } from "@/lib/billing/config";
import { BillingConfigurationError } from "@/lib/billing/errors";
import { getAuthenticatedBillingUser, getOrCreateStripeCustomerId } from "@/lib/billing/supabase";
import { getStripeClient } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getRequestOrigin(request: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (!configuredOrigin) {
    return request.nextUrl.origin;
  }

  const parsed = new URL(configuredOrigin);
  return parsed.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const input = parseCheckoutInput(body);

    if (!input) {
      return json({ error: "Invalid billing request." }, 400);
    }

    const user = await getAuthenticatedBillingUser();
    if (!user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const origin = getRequestOrigin(request);
    const customerId = await getOrCreateStripeCustomerId(user);
    let metadata: Record<string, string>;

    if (input.kind === "subscription") {
      metadata = {
        user_id: user.id,
        kind: "subscription",
        plan: PRO_PLAN.id,
      };
    } else {
      metadata = {
        user_id: user.id,
        kind: "credits",
        pack: input.pack,
        credits: String(CREDIT_PACKS[input.pack].credits),
      };
    }

    const session =
      input.kind === "subscription"
        ? await getStripeClient().checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            client_reference_id: user.id,
            success_url: new URL("/billing?checkout=success", origin).toString(),
            cancel_url: new URL("/billing?checkout=cancelled", origin).toString(),
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: PRO_PLAN.currency,
                  unit_amount: PRO_PLAN.unitAmount,
                  recurring: {
                    interval: PRO_PLAN.interval,
                  },
                  product_data: {
                    name: PRO_PLAN.name,
                  },
                },
              },
            ],
            metadata,
            subscription_data: {
              metadata,
            },
          })
        : await getStripeClient().checkout.sessions.create({
            mode: "payment",
            customer: customerId,
            client_reference_id: user.id,
            success_url: new URL("/billing?checkout=credits-success", origin).toString(),
            cancel_url: new URL("/billing?checkout=credits-cancelled", origin).toString(),
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: CREDIT_PACKS[input.pack].currency,
                  unit_amount: CREDIT_PACKS[input.pack].unitAmount,
                  product_data: {
                    name: CREDIT_PACKS[input.pack].name,
                  },
                },
              },
            ],
            metadata,
            payment_intent_data: {
              metadata,
            },
          });

    if (!session.url) {
      throw new Error("Stripe Checkout did not return a session URL.");
    }

    return json({ url: session.url });
  } catch (error) {
    console.error("[billing.checkout]", error);
    const status = error instanceof BillingConfigurationError ? 500 : 502;
    return json({ error: "Billing checkout unavailable." }, status);
  }
}
