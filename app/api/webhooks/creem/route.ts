import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseCreemEvent, verifyCreemSignature, type CreemWebhookEvent } from "@/lib/creem/webhooks";
import { creditPackByProductId, planByProductId } from "@/lib/plans";
import type { SubscriptionStatus } from "@/lib/supabase/types";

// IMPORTANT: Next.js must give us the raw body so we can verify the HMAC
// signature. Forcing the Node runtime and reading request.text() preserves
// bytes exactly as they arrived.
export const runtime = "nodejs";

interface CreemSubscriptionPayload {
  id: string;
  status?: string;
  customer?: { id?: string; email?: string } | string;
  product?: { id?: string } | string;
  product_id?: string;
  customer_id?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  canceled_at?: string | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
}

interface CreemCheckoutPayload {
  id: string;
  request_id?: string;
  customer?: { id?: string; email?: string } | string;
  product?: { id?: string } | string;
  product_id?: string;
  customer_id?: string;
  subscription?: CreemSubscriptionPayload | null;
  order_type?: "subscription" | "one_time";
  metadata?: Record<string, string> | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractCustomerId(obj: { customer?: unknown; customer_id?: unknown }): string | null {
  if (typeof obj.customer_id === "string") return obj.customer_id;
  if (typeof obj.customer === "string") return obj.customer;
  if (obj.customer && typeof obj.customer === "object" && "id" in obj.customer) {
    return asString((obj.customer as { id: unknown }).id);
  }
  return null;
}

function extractProductId(obj: { product?: unknown; product_id?: unknown }): string | null {
  if (typeof obj.product_id === "string") return obj.product_id;
  if (typeof obj.product === "string") return obj.product;
  if (obj.product && typeof obj.product === "object" && "id" in obj.product) {
    return asString((obj.product as { id: unknown }).id);
  }
  return null;
}

function mapStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    case "unpaid":
      return status;
    default:
      return "incomplete";
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("creem-signature") ?? request.headers.get("x-creem-signature");

  if (!verifyCreemSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CreemWebhookEvent;
  try {
    event = parseCreemEvent(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency — short-circuit if we've already processed this event.
  const { error: insertError } = await tbl(admin, "webhook_events").insert({
    provider: "creem",
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      // duplicate — already handled, ack
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("webhook insert failed", insertError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.completed":
        await handleCheckoutCompleted(admin, event.data.object as unknown as CreemCheckoutPayload);
        break;

      case "subscription.created":
      case "subscription.updated":
      case "subscription.renewed":
      case "subscription.paused":
      case "subscription.resumed":
        await upsertSubscription(
          admin,
          event.data.object as unknown as CreemSubscriptionPayload,
          event.type === "subscription.renewed",
        );
        break;

      case "subscription.canceled":
        await markCanceled(admin, event.data.object as unknown as CreemSubscriptionPayload);
        break;

      default:
        // Unhandled event types are recorded in webhook_events above.
        break;
    }
  } catch (err) {
    console.error(`webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ----------------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------------

type Admin = ReturnType<typeof createAdminClient>;

interface WriteTable {
  insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
  update: (row: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
  };
}

const tbl = (admin: Admin, name: string): WriteTable =>
  admin.from(name) as unknown as WriteTable;

const rpc = (admin: Admin, fn: string, args: Record<string, unknown>) => {
  const call = admin.rpc as unknown as (
    f: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return call(fn, args);
};

async function resolveUserId(
  admin: Admin,
  payload: { request_id?: string; metadata?: Record<string, string> | null },
  customerId: string | null,
): Promise<string | null> {
  // 1. request_id from checkout creation (we set it to user.id)
  if (payload.request_id && /^[0-9a-f-]{20,}$/i.test(payload.request_id)) {
    return payload.request_id;
  }
  // 2. metadata.user_id set on checkout creation
  const metaUser = payload.metadata?.user_id;
  if (metaUser) return metaUser;
  // 3. existing profile linked to creem_customer_id
  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("creem_customer_id", customerId)
      .maybeSingle();
    const row = data as { id: string } | null;
    if (row?.id) return row.id;
  }
  return null;
}

async function handleCheckoutCompleted(admin: Admin, payload: CreemCheckoutPayload) {
  const customerId = extractCustomerId(payload);
  const productId = extractProductId(payload);
  const userId = await resolveUserId(admin, payload, customerId);
  if (!userId) {
    console.warn("checkout.completed with no resolvable user", payload);
    return;
  }

  // Persist the creem customer id on the profile so later checkouts can reuse it.
  if (customerId) {
    await tbl(admin, "profiles").update({ creem_customer_id: customerId }).eq("id", userId);
  }

  // One-time credit pack?
  const pack = creditPackByProductId(productId);
  if (pack) {
    await rpc(admin, "add_credits", {
      p_user: userId,
      p_delta: pack.credits,
      p_reason: "purchase",
      p_metadata: { pack: pack.key, checkout_id: payload.id },
    });
    return;
  }

  // Subscription checkout — if Creem embedded the subscription, upsert it.
  if (payload.subscription) {
    await upsertSubscription(admin, payload.subscription, true);
  }
}

async function upsertSubscription(
  admin: Admin,
  payload: CreemSubscriptionPayload,
  topUpCredits: boolean,
) {
  const customerId = extractCustomerId(payload);
  const productId = extractProductId(payload);
  if (!productId || !customerId) {
    console.warn("subscription event missing product/customer", payload);
    return;
  }

  const userId = await resolveUserId(admin, payload, customerId);
  if (!userId) {
    console.warn("subscription event with no resolvable user", payload);
    return;
  }

  const plan = planByProductId(productId);
  const planKey = plan?.key ?? "starter";
  const status = mapStatus(payload.status);

  await tbl(admin, "profiles").update({ creem_customer_id: customerId }).eq("id", userId);

  const { data: existingRow } = await admin
    .from("subscriptions")
    .select("id, creem_product_id")
    .eq("creem_subscription_id", payload.id)
    .maybeSingle();
  const existing = existingRow as { id: string; creem_product_id: string } | null;

  const row = {
    user_id: userId,
    creem_subscription_id: payload.id,
    creem_customer_id: customerId,
    creem_product_id: productId,
    plan_key: planKey,
    status,
    current_period_start: payload.current_period_start_date ?? null,
    current_period_end: payload.current_period_end_date ?? null,
    cancel_at_period_end: payload.cancel_at_period_end ?? false,
    canceled_at: payload.canceled_at ?? null,
  };

  if (existing) {
    await tbl(admin, "subscriptions").update(row).eq("id", existing.id);
  } else {
    await tbl(admin, "subscriptions").insert(row);
  }

  // Credit top-up on create / renewal / plan change.
  if (topUpCredits && plan && plan.monthlyCredits > 0 && status === "active") {
    await rpc(admin, "add_credits", {
      p_user: userId,
      p_delta: plan.monthlyCredits,
      p_reason: "subscription_topup",
      p_metadata: {
        plan: plan.key,
        subscription_id: payload.id,
        period_start: payload.current_period_start_date ?? null,
      },
    });
  }
}

async function markCanceled(admin: Admin, payload: CreemSubscriptionPayload) {
  await tbl(admin, "subscriptions")
    .update({
      status: "canceled",
      canceled_at: payload.canceled_at ?? new Date().toISOString(),
      cancel_at_period_end: payload.cancel_at_period_end ?? false,
    })
    .eq("creem_subscription_id", payload.id);
}
