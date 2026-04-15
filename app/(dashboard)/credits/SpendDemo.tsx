"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SpendDemo() {
  const router = useRouter();
  const [amount, setAmount] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okBalance, setOkBalance] = useState<number | null>(null);

  async function spend() {
    setError(null);
    setOkBalance(null);
    try {
      const res = await fetch("/api/credits/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: "demo_spend" }),
      });
      const json = (await res.json()) as { balance?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Spend failed");
      setOkBalance(json.balance ?? null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        spend();
      }}
    >
      <label>
        Amount
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Spending…" : "Spend credits"}
      </button>
      {error ? <p className="alert alert-error">{error}</p> : null}
      {okBalance !== null ? (
        <p className="alert alert-success">New balance: {okBalance.toLocaleString()}</p>
      ) : null}
    </form>
  );
}
