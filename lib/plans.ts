// Plan catalogue. Keep this in sync with your Creem dashboard products.
// Each plan declares the credits it grants on each renewal so the webhook
// handler can auto top-up user wallets.

import { env } from "@/lib/env";

export type PlanKey = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  key: PlanKey;
  name: string;
  description: string;
  priceLabel: string;
  interval: "month" | "year" | "one_time" | "free";
  monthlyCredits: number;
  features: string[];
  highlight?: boolean;
  productId: () => string;
}

export const plans: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    description: "Kick the tyres. No card required.",
    priceLabel: "$0",
    interval: "free",
    monthlyCredits: 25,
    features: ["25 credits / month", "Community support", "Single project"],
    productId: () => "",
  },
  starter: {
    key: "starter",
    name: "Starter",
    description: "For solo builders shipping their first product.",
    priceLabel: "$19",
    interval: "month",
    monthlyCredits: 500,
    features: ["500 credits / month", "Email support", "3 projects", "Standard models"],
    productId: env.products.starter,
  },
  pro: {
    key: "pro",
    name: "Pro",
    description: "For growing teams who need more headroom.",
    priceLabel: "$49",
    interval: "month",
    monthlyCredits: 2500,
    features: [
      "2,500 credits / month",
      "Priority support",
      "Unlimited projects",
      "Advanced models",
      "Custom branding",
    ],
    highlight: true,
    productId: env.products.pro,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "For organisations with dedicated needs.",
    priceLabel: "$199",
    interval: "month",
    monthlyCredits: 15000,
    features: [
      "15,000 credits / month",
      "Dedicated support",
      "SSO + audit logs",
      "99.9% SLA",
      "Custom contracts",
    ],
    productId: env.products.enterprise,
  },
};

export const orderedPlans: Plan[] = [plans.starter, plans.pro, plans.enterprise];

export const planByProductId = (productId: string | null | undefined): Plan | null => {
  if (!productId) return null;
  const match = Object.values(plans).find((p) => p.productId() === productId);
  return match ?? null;
};

// Credit packs (one-time purchases). Extend as needed.
export interface CreditPack {
  key: string;
  name: string;
  credits: number;
  priceLabel: string;
  productId: () => string;
}

export const creditPacks: CreditPack[] = [
  {
    key: "credits_1000",
    name: "1,000 credits",
    credits: 1000,
    priceLabel: "$15",
    productId: env.products.creditsPack,
  },
];

export const creditPackByProductId = (productId: string | null | undefined): CreditPack | null => {
  if (!productId) return null;
  return creditPacks.find((pack) => pack.productId() === productId) ?? null;
};
