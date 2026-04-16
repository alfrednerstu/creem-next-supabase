import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { orderedPlans } from "@/lib/plans";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="container">
            <h1>Ship your SaaS this weekend</h1>
            <p>
              A production-ready Next.js 14 starter with Supabase auth, Creem payments,
              subscription management, credit wallets and webhook handlers — wired up and ready
              to deploy.
            </p>
            <div className="cta-row">
              <Link href="/sign-up" className="btn btn-primary">
                Start free
              </Link>
              <Link href="/pricing" className="btn btn-ghost">
                View pricing
              </Link>
            </div>
          </div>
        </section>

        <section id="features">
          <div className="container stack">
            <header className="row-between">
              <h2 className="mb-0">Everything a billed product needs</h2>
              <Link href="/pricing">See plans &rarr;</Link>
            </header>
            <ul className="tiles" style={{ listStyle: "none", padding: 0 }}>
              <li className="tile">
                <span className="icon">01</span>
                <h4>Auth</h4>
                <p className="mb-0 muted">
                  Supabase email + OAuth with server-side session refresh.
                </p>
              </li>
              <li className="tile">
                <span className="icon">02</span>
                <h4>Subscriptions</h4>
                <p className="mb-0 muted">Checkout, upgrades, downgrades, cancellations.</p>
              </li>
              <li className="tile">
                <span className="icon">03</span>
                <h4>Credits</h4>
                <p className="mb-0 muted">
                  Wallet, atomic spend, ledger, auto top-up on renewal.
                </p>
              </li>
              <li className="tile">
                <span className="icon">04</span>
                <h4>Webhooks</h4>
                <p className="mb-0 muted">Signature-verified, idempotent, typed events.</p>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <div className="container">
            <header className="row-between" style={{ marginBottom: "var(--sp-8)" }}>
              <h2 className="mb-0">Plans</h2>
              <Link href="/pricing">Compare all &rarr;</Link>
            </header>
            <div className="pricing">
              {orderedPlans.map((plan) => (
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
                  <Link
                    href="/sign-up"
                    className={plan.highlight ? "btn btn-primary btn-block" : "btn btn-ghost btn-block"}
                  >
                    Start with {plan.name}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
