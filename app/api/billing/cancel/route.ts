import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { creem } from "@/lib/creem/client";

/**
 * Schedule a cancellation at the end of the current billing period. The
 * webhook event will update our DB row when Creem confirms the change.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("creem_subscription_id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .maybeSingle();
  const sub = data as { creem_subscription_id: string } | null;

  if (!sub?.creem_subscription_id) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    await creem.cancelSubscription(sub.creem_subscription_id);
    const subs = admin.from("subscriptions") as unknown as {
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<unknown>;
      };
    };
    await subs.update({ cancel_at_period_end: true }).eq("creem_subscription_id", sub.creem_subscription_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
