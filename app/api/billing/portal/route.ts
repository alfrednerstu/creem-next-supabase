import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { creem } from "@/lib/creem/client";

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
    .from("profiles")
    .select("creem_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as { creem_customer_id: string | null } | null;

  if (!profile?.creem_customer_id) {
    return NextResponse.json(
      { error: "No Creem customer on file. Complete a checkout first." },
      { status: 400 },
    );
  }

  try {
    const portal = await creem.createCustomerPortalSession(profile.creem_customer_id);
    return NextResponse.json({ url: portal.customer_portal_link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
