// Hand-written DB types matching supabase/migrations/0001_init.sql
// Regenerate with `supabase gen types typescript` if you extend the schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "unpaid";

export type CreditLedgerReason =
  | "signup_bonus"
  | "subscription_topup"
  | "purchase"
  | "spend"
  | "refund"
  | "admin_adjust";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          creem_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          creem_customer_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          creem_subscription_id: string;
          creem_customer_id: string;
          creem_product_id: string;
          plan_key: string;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["subscriptions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      credit_wallets: {
        Row: {
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
        };
        Update: Partial<Database["public"]["Tables"]["credit_wallets"]["Insert"]>;
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          balance_after: number;
          reason: CreditLedgerReason;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          delta: number;
          balance_after: number;
          reason: CreditLedgerReason;
          metadata?: Json;
        };
        Update: never;
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          event_type: string;
          payload: Json;
          received_at: string;
        };
        Insert: {
          provider: string;
          event_id: string;
          event_type: string;
          payload: Json;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_credits: {
        Args: {
          p_user: string;
          p_delta: number;
          p_reason: CreditLedgerReason;
          p_metadata: Json;
        };
        Returns: number;
      };
    };
    Enums: {
      subscription_status: SubscriptionStatus;
      credit_ledger_reason: CreditLedgerReason;
    };
  };
}
