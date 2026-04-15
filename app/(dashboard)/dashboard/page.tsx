import Link from "next/link";
import {
  getActiveSubscription,
  getLedger,
  getSessionUser,
  getWallet,
  hasActivePlan,
} from "@/lib/db/queries";
import { plans } from "@/lib/plans";

export const metadata = { title: "Dashboard · Creem × Supabase" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [subscription, wallet, ledger] = await Promise.all([
    getActiveSubscription(user.id),
    getWallet(user.id),
    getLedger(user.id, 5),
  ]);

  const planKey = (subscription?.plan_key ?? "free") as keyof typeof plans;
  const plan = plans[planKey] ?? plans.free;
  const active = hasActivePlan(subscription);

  return (
    <>
      <header style={{ marginBottom: "var(--sp-8)" }}>
        <h2 className="mb-0">Welcome back.</h2>
        <p className="muted mb-0">Here&apos;s the state of your account.</p>
      </header>

      <section className="grid grid-3" style={{ padding: 0, marginBottom: "var(--sp-8)" }}>
        <article className="card kpi">
          <label>Plan</label>
          <strong>{plan.name}</strong>
          <small>
            {active ? (
              <span className="badge badge-success">Active</span>
            ) : (
              <span className="badge badge-warning">No subscription</span>
            )}
          </small>
        </article>

        <article className="card kpi">
          <label>Credit balance</label>
          <strong>{(wallet?.balance ?? 0).toLocaleString()}</strong>
          <small>
            Lifetime earned {(wallet?.lifetime_earned ?? 0).toLocaleString()} · spent{" "}
            {(wallet?.lifetime_spent ?? 0).toLocaleString()}
          </small>
        </article>

        <article className="card kpi">
          <label>Renews</label>
          <strong>
            {subscription?.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : "—"}
          </strong>
          <small>
            {subscription?.cancel_at_period_end
              ? "Cancels at period end"
              : active
                ? "Auto-renew on"
                : "Pick a plan to get started"}
          </small>
        </article>
      </section>

      <section className="grid grid-2" style={{ padding: 0, marginBottom: "var(--sp-8)" }}>
        <article className="card">
          <header>
            <h4 className="mb-0">Your plan</h4>
            <Link href="/billing">Manage &rarr;</Link>
          </header>
          <p>{plan.description}</p>
          <ul>
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {!active ? (
            <Link href="/pricing" className="btn btn-primary">
              Choose a plan
            </Link>
          ) : null}
        </article>

        <article className="card">
          <header>
            <h4 className="mb-0">Recent credit activity</h4>
            <Link href="/credits">View all &rarr;</Link>
          </header>
          {ledger.length === 0 ? (
            <p className="muted mb-0">No activity yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th className="text-right">Delta</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id}>
                    <td>{row.reason.replaceAll("_", " ")}</td>
                    <td className="text-right mono">
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                    <td className="text-right mono">{row.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </>
  );
}
