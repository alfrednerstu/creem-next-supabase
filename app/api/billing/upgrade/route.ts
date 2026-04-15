import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { creem } from "@/lib/creem/client";
import { env } from "@/lib/env";

/**
 * Upgrade / downgrade the user's active subscription to a new product. Creem
 * will proration-charge the difference immediately. If no subscription exists,
 * we fall back to a fresh checkout session.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { productId?: string };
  const productId = body.productId?.trim();
  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("creem_subscription_id, creem_customer_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .maybeSingle();
  const existing = data as
    | { creem_subscription_id: string; creem_customer_id: string; status: string }
    | null;

  try {
    if (existing?.creem_subscription_id) {
      await creem.upgradeSubscription(existing.creem_subscription_id, productId);
      // Webhook will sync the DB; return a dashboard URL for the client.
      return NextResponse.json({ url: `${env.siteUrl()}/billing?updated=1` });
    }

    const session = await creem.createCheckoutSession({
      productId,
      requestId: user.id,
      successUrl: `${env.siteUrl()}/dashboard?checkout=success`,
      customerId: existing?.creem_customer_id ?? undefined,
      customerEmail: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    return NextResponse.json({ url: session.checkout_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
