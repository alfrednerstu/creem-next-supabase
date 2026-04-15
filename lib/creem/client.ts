// Thin wrapper around the Creem REST API. Documented endpoints used here:
//   POST /v1/checkouts          - create a Checkout session
//   GET  /v1/subscriptions/{id} - fetch a subscription
//   POST /v1/subscriptions/{id}/upgrade
//   POST /v1/subscriptions/{id}/cancel
//   POST /v1/customers/billing   - customer portal session
// If the Creem API shape shifts, adjust the payload types here only.

import { env } from "@/lib/env";

export interface CreemCheckoutSessionInput {
  productId: string;
  successUrl: string;
  /** Opaque, echoed back on the webhook so we can reconcile to a user. */
  requestId: string;
  customerEmail?: string;
  /** If provided, Creem will attach the checkout to an existing customer. */
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CreemCheckoutSession {
  id: string;
  checkout_url: string;
}

export interface CreemSubscription {
  id: string;
  status: string;
  customer: { id: string; email?: string };
  product: { id: string };
  current_period_start_date?: string;
  current_period_end_date?: string;
  canceled_at?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
}

export interface CreemCustomerPortal {
  customer_portal_link: string;
}

async function creemFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.creemApiUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.creemApiKey(),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Creem API ${res.status} ${res.statusText} on ${path}: ${body}`);
  }

  return (await res.json()) as T;
}

export const creem = {
  createCheckoutSession(input: CreemCheckoutSessionInput) {
    return creemFetch<CreemCheckoutSession>("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_id: input.productId,
        request_id: input.requestId,
        success_url: input.successUrl,
        customer: input.customerId
          ? { id: input.customerId }
          : input.customerEmail
            ? { email: input.customerEmail }
            : undefined,
        metadata: input.metadata ?? {},
      }),
    });
  },

  getSubscription(subscriptionId: string) {
    return creemFetch<CreemSubscription>(`/subscriptions/${subscriptionId}`);
  },

  upgradeSubscription(subscriptionId: string, productId: string) {
    return creemFetch<CreemSubscription>(`/subscriptions/${subscriptionId}/upgrade`, {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        update_behavior: "proration-charge-immediately",
      }),
    });
  },

  cancelSubscription(subscriptionId: string) {
    return creemFetch<CreemSubscription>(`/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
    });
  },

  createCustomerPortalSession(customerId: string) {
    return creemFetch<CreemCustomerPortal>(`/customers/billing`, {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId }),
    });
  },
};
