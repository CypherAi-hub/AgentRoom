export type CheckoutKind = "subscription" | "credits";
export type CreditPackId = "credits_50" | "credits_120" | "credits_300";

export type BillingCheckoutInput =
  | {
      kind: "subscription";
    }
  | {
      kind: "credits";
      pack: CreditPackId;
    };

export const PRO_PLAN = {
  id: "pro",
  name: "Agent Room Pro",
  unitAmount: 2_000,
  currency: "usd",
  interval: "month",
} as const;

export const CREDIT_PACKS: Record<
  CreditPackId,
  {
    id: CreditPackId;
    name: string;
    credits: number;
    unitAmount: number;
    currency: "usd";
  }
> = {
  credits_50: {
    id: "credits_50",
    name: "Agent Room Credits - 50",
    credits: 50,
    unitAmount: 500,
    currency: "usd",
  },
  credits_120: {
    id: "credits_120",
    name: "Agent Room Credits - 120",
    credits: 120,
    unitAmount: 1_000,
    currency: "usd",
  },
  credits_300: {
    id: "credits_300",
    name: "Agent Room Credits - 300",
    credits: 300,
    unitAmount: 2_000,
    currency: "usd",
  },
};

export function parseCheckoutInput(body: unknown): BillingCheckoutInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as { kind?: unknown; pack?: unknown };
  if (candidate.kind === "subscription") {
    return { kind: "subscription" };
  }

  if (
    candidate.kind === "credits" &&
    typeof candidate.pack === "string" &&
    candidate.pack in CREDIT_PACKS
  ) {
    return { kind: "credits", pack: candidate.pack as CreditPackId };
  }

  return null;
}
