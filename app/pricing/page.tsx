import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getActiveSubscription, getSessionUser } from "@/lib/db/queries";
import { creditPacks, orderedPlans, plans } from "@/lib/plans";
import CheckoutButton from "./CheckoutButton";

export const metadata = { title: "Pricing · Template" };

export default async function PricingPage() {
  const user = await getSessionUser();
  const subscription = user ? await getActiveSubscription(user.id) : null;
  const currentPlanKey = subscription?.plan_key ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" style={{ padding: "var(--sp-16) 0 var(--sp-8)" }}>
          <div className="container">
            <h1>Simple pricing</h1>
            <p>Start free. Upgrade when you need more. Cancel from inside the app.</p>
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="pricing">
              {orderedPlans.map((plan) => {
                const isCurrent = currentPlanKey === plan.key;
                return (
                  <article key={plan.key} className={plan.highlight ? "featured" : undefined}>
                    <header style={{ display: "block", marginBottom: 0 }}>
                      <span className={plan.highlight ? "badge badge-accent" : "badge"}>
                        {plan.name}
                      </span>
                      <h3 style={{ marginTop: "var(--sp-3)", marginBottom: "var(--sp-2)" }}>
                        {plan.description}
                      </h3>
                      <p className="price">
                        <strong>{plan.priceLabel}</strong>
                        <span className="muted"> / {plan.interval}</span>
                      </p>
                    </header>
                    <ul>
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span className="badge badge-success">Current plan</span>
                    ) : user ? (
                      <CheckoutButton
                        productId={plan.productId()}
                        label={
                          subscription
                            ? plan.key === "business"
                              ? "Upgrade"
                              : "Switch plan"
                            : `Choose ${plan.name}`
                        }
                        mode={subscription ? "upgrade" : "subscribe"}
                        variant={plan.highlight ? "primary" : "ghost"}
                      />
                    ) : (
                      <Link
                        href={`/sign-up?plan=${plan.key}`}
                        className={
                          plan.highlight
                            ? "btn btn-primary btn-block"
                            : "btn btn-ghost btn-block"
                        }
                      >
                        Start with {plan.name}
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <header style={{ marginBottom: "var(--sp-6)" }}>
              <h2 className="mb-0">Credit packs</h2>
              <p className="muted mb-0">Top up your balance without changing your plan.</p>
            </header>
            <div className="grid grid-3">
              {creditPacks.map((pack) => (
                <article key={pack.key} className="card">
                  <header>
                    <h4 className="mb-0">{pack.name}</h4>
                    <span className="badge badge-accent">One-time</span>
                  </header>
                  <p className="price">
                    <strong>{pack.priceLabel}</strong>
                  </p>
                  {user ? (
                    <CheckoutButton
                      productId={pack.productId()}
                      label="Buy credits"
                      mode="one_time"
                      variant="primary"
                    />
                  ) : (
                    <Link href="/sign-up" className="btn btn-primary btn-block">
                      Sign up to buy
                    </Link>
                  )}
                </article>
              ))}
              <article className="card card-muted">
                <header>
                  <h4 className="mb-0">Earn free credits</h4>
                </header>
                <p className="muted">
                  Every signup gets {plans.free.monthlyCredits} credits. Paid plans auto top-up on
                  every renewal.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
