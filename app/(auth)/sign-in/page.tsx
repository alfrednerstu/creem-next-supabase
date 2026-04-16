import Link from "next/link";
import SignInForm from "./SignInForm";

export const metadata = { title: "Sign in · Template" };

export default function SignInPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h2 className="mt-0">Welcome back</h2>
        <p className="muted">Sign in to manage your subscription and credits.</p>
        <SignInForm next={searchParams.next ?? "/dashboard"} />
        <p className="mt-0" style={{ fontSize: "var(--fs-14)", textAlign: "center" }}>
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
