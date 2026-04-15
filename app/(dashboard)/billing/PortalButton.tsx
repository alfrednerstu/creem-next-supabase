"use client";

import { useState } from "react";

export default function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Unable to open portal");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={openPortal} disabled={loading}>
        {loading ? "Opening…" : "Open billing portal"}
      </button>
      {error ? (
        <small className="alert alert-error" role="alert">
          {error}
        </small>
      ) : null}
    </>
  );
}
