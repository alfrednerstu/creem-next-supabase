import Link from "next/link";
import {
  getActiveSubscription,
  getProfile,
  getSessionUser,
  getSubscriptions,
  hasActivePlan,
} from "@/lib/db/queries";
import { plans } from "@/lib/plans";
import PortalButton from "./PortalButton";
import CancelButton from "./CancelButton";

export const metadata = { title: "Billing · Template" };

export default async function BillingPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [profile, subscription, history] = await Promise.all([
    getProfile(user.id),
    getActiveSubscription(user.id),
    getSubscriptions(user.id),
  ]);

  const plan = subscription ? plans[subscription.plan_key as keyof typeof plans] : null;
  const active = hasActivePlan(subscription);

  return (
    <>
      <header style={{ marginBottom: "var(--sp-8)" }}>
        <h2 style={{ marginBottom: "0.5em" }}>Billing</h2>
        <p className="muted mb-0">Manage your subscription, payment method and invoices.</p>
      </header>

      <section className="card card-lg" style={{ marginBottom: "var(--sp-6)" }}>
        <header>
          <h4 className="mb-0">Current subscription</h4>
          {active ? (
            <span className="badge badge-success">{subscription?.status}</span>
          ) : (
            <span className="badge badge-warning">No active plan</span>
          )}
        </header>

        {subscription && plan ? (
          <div className="stack">
            <p className="mb-0">
              <strong>{plan.name}</strong> · {plan.priceLabel} / {plan.interval}
            </p>
            <p className="muted mb-0">
              {subscription.current_period_start
                ? `Current period: ${new Date(subscription.current_period_start).toLocaleDateString()}`
                : null}
              {subscription.current_period_end
                ? ` → ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : null}
            </p>
            {subscription.cancel_at_period_end ? (
              <p className="alert">
                Your plan will cancel at the end of the current period. You can re-subscribe any
                time from the <Link href="/pricing">pricing page</Link>.
              </p>
            ) : null}

            <div className="row" style={{ flexWrap: "wrap" }}>
              <Link href="/pricing" className="btn btn-ghost">
                Change plan
              </Link>
              {profile?.creem_customer_id ? <PortalButton /> : null}
              {!subscription.cancel_at_period_end ? <CancelButton /> : null}
            </div>
          </div>
        ) : (
          <div className="stack">
            <p>You don&apos;t have an active subscription.</p>
            <Link href="/pricing" className="btn btn-primary">
              Choose a plan
            </Link>
          </div>
        )}
      </section>

      <section className="card">
        <header>
          <h4 className="mb-0">Subscription history</h4>
        </header>
        {history.length === 0 ? (
          <p className="muted mb-0">Nothing yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Status</th>
                <th>Started</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {history.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.plan_key}</td>
                  <td>
                    <span className="badge">{sub.status}</span>
                  </td>
                  <td className="mono">
                    {sub.current_period_start
                      ? new Date(sub.current_period_start).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="mono">
                    {sub.canceled_at ? new Date(sub.canceled_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
