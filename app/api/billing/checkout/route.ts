import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { creem } from "@/lib/creem/client";
import { env } from "@/lib/env";

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

  // Look up the existing Creem customer (if the user has one) so that the
  // checkout attaches to the same customer record.
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("creem_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as { creem_customer_id: string | null; email: string | null } | null;

  try {
    const session = await creem.createCheckoutSession({
      productId,
      requestId: user.id,
      successUrl: `${env.siteUrl()}/dashboard?checkout=success`,
      customerId: profile?.creem_customer_id ?? undefined,
      customerEmail: profile?.email ?? user.email ?? undefined,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.checkout_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
