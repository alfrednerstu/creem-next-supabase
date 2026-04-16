import Link from "next/link";
import { getSessionUser } from "@/lib/db/queries";

export default async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="app-header bordered">
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden />
          Template
        </Link>

        <nav className="nav-primary" aria-label="Primary">
          <Link href="/">Overview</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#features">Features</Link>
          {user ? <Link href="/dashboard">Dashboard</Link> : null}
        </nav>

        <div className="header-end">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
