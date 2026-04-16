// Centralised env access. Missing variables throw at runtime where used,
// never at module load, so the build pipeline and CI stays green even
// without secrets configured.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/**
 * Accepts both the new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` name (Supabase's
 * recommended naming since late-2024) and the older `ANON_KEY` so existing
 * deployments keep working.
 */
function supabaseClientKey(): string {
  const pk = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (pk && pk.length > 0) return pk;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon && anon.length > 0) return anon;
  throw new Error(
    "Missing Supabase client key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
  );
}

export const env = {
  siteUrl: () => optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseClientKey,
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  creemApiKey: () => required("CREEM_API_KEY"),
  creemApiUrl: () => optional("CREEM_API_URL", "https://api.creem.io/v1"),
  creemWebhookSecret: () => required("CREEM_WEBHOOK_SECRET"),

  products: {
    starter: () => optional("CREEM_PRODUCT_STARTER"),
    pro: () => optional("CREEM_PRODUCT_PRO"),
    business: () => optional("CREEM_PRODUCT_BUSINESS"),
    creditsPack: () => optional("CREEM_PRODUCT_CREDITS_PACK"),
  },
};
