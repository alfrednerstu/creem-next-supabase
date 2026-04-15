"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Unable to cancel");
      setConfirming(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--sp-2)" }}>
      <small className="muted">You&apos;ll keep access until the end of the current period.</small>
      <div className="row">
        <button type="button" className="btn btn-danger" onClick={cancel} disabled={pending}>
          {pending ? "Cancelling…" : "Confirm cancel"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Keep subscription
        </button>
      </div>
      {error ? <small className="alert alert-error">{error}</small> : null}
    </div>
  );
}
