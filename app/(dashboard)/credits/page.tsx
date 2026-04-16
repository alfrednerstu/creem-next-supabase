import Link from "next/link";
import { getLedger, getSessionUser, getWallet } from "@/lib/db/queries";
import SpendDemo from "./SpendDemo";

export const metadata = { title: "Credits · Template" };

export default async function CreditsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [wallet, ledger] = await Promise.all([getWallet(user.id), getLedger(user.id, 50)]);

  return (
    <>
      <header style={{ marginBottom: "var(--sp-6)" }}>
        <h2 style={{ marginBottom: "0.5em" }}>Credits</h2>
        <p className="muted mb-0">
          Spend credits on any action in your app. Auto-topped up on subscription renewals.
        </p>
      </header>

      <section className="grid grid-3" style={{ padding: 0, marginBottom: "var(--sp-6)" }}>
        <article className="card kpi">
          <label>Balance</label>
          <strong>{(wallet?.balance ?? 0).toLocaleString()}</strong>
          <small>credits available</small>
        </article>
        <article className="card kpi">
          <label>Lifetime earned</label>
          <strong>{(wallet?.lifetime_earned ?? 0).toLocaleString()}</strong>
        </article>
        <article className="card kpi">
          <label>Lifetime spent</label>
          <strong>{(wallet?.lifetime_spent ?? 0).toLocaleString()}</strong>
        </article>
      </section>

      <section className="grid grid-2" style={{ padding: 0, marginBottom: "var(--sp-6)" }}>
        <article className="card">
          <header>
            <h4 className="mb-0">Top up</h4>
          </header>
          <p className="muted">
            Buy a one-time credit pack, or upgrade your plan to get more credits every month.
          </p>
          <Link href="/pricing" className="btn btn-primary">
            Buy credits
          </Link>
        </article>
        <article className="card">
          <header>
            <h4 className="mb-0">Spend a credit</h4>
          </header>
          <p className="muted">
            Demo endpoint. Call <code>/api/credits/spend</code> from anywhere to deduct atomically.
          </p>
          <SpendDemo />
        </article>
      </section>

      <section className="card">
        <header>
          <h4 className="mb-0">Ledger</h4>
        </header>
        {ledger.length === 0 ? (
          <p className="muted mb-0">No activity yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Reason</th>
                <th className="text-right">Delta</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{new Date(row.created_at).toLocaleString()}</td>
                  <td>{row.reason.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())}</td>
                  <td className="text-right mono">
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className="text-right mono">{row.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
