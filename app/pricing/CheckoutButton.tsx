"use client";

import { useState } from "react";

type Mode = "subscribe" | "upgrade" | "one_time";
type Variant = "primary" | "ghost";

export default function CheckoutButton({
  productId,
  label,
  mode,
  variant = "primary",
}: {
  productId: string;
  label: string;
  mode: Mode;
  variant?: Variant;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!productId) {
      setError("This plan isn't configured yet. Set the product ID in your .env.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "upgrade" ? "/api/billing/upgrade" : "/api/billing/checkout";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, mode }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Unable to start checkout");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const className = variant === "primary" ? "btn btn-primary btn-block" : "btn btn-ghost btn-block";

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting…" : label}
      </button>
      {error ? (
        <p className="alert alert-error" role="alert" style={{ marginTop: "var(--sp-3)" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
