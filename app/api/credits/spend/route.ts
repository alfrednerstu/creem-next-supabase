import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mutateCredits } from "@/lib/db/queries";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    reason?: string;
  };
  const amount = Math.floor(Number(body.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  try {
    const newBalance = await mutateCredits({
      userId: user.id,
      delta: -amount,
      reason: "spend",
      metadata: { note: body.reason ?? "spend" },
    });
    return NextResponse.json({ balance: newBalance });
  } catch (err) {
    // The SQL CHECK on credit_wallets.balance >= 0 surfaces as a postgres
    // error here — translate to a 402 so the client knows to top up.
    const message = err instanceof Error ? err.message : "Unknown error";
    if (/violates check constraint/i.test(message)) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
