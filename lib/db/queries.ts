import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Database, SubscriptionStatus } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type CreditWallet = Database["public"]["Tables"]["credit_wallets"]["Row"];
export type CreditLedgerEntry = Database["public"]["Tables"]["credit_ledger"]["Row"];
export type CreditLedgerReason = Database["public"]["Enums"]["credit_ledger_reason"];

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Subscription | null) ?? null;
}

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as Subscription[] | null) ?? [];
}

export async function getWallet(userId: string): Promise<CreditWallet | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("credit_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as CreditWallet | null) ?? null;
}

export async function getLedger(userId: string, limit = 20): Promise<CreditLedgerEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as CreditLedgerEntry[] | null) ?? [];
}

/**
 * Server-only: adjust wallet balance via the SQL helper. Uses the service
 * role so it can bypass RLS. Returns the new balance.
 */
export async function mutateCredits(params: {
  userId: string;
  delta: number;
  reason: CreditLedgerReason;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const admin = createAdminClient();
  const rpc = admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: number | null; error: { message: string } | null }>;
  const { data, error } = await rpc("add_credits", {
    p_user: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_metadata: params.metadata ?? {},
  });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export function hasActivePlan(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return ACTIVE_STATUSES.includes(subscription.status);
}
