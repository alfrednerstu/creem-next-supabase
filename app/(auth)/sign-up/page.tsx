import Link from "next/link";
import SignUpForm from "./SignUpForm";

export const metadata = { title: "Create account · Template" };

export default function SignUpPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h2 className="mt-0">Create your account</h2>
        <p className="muted">Get 25 credits free on signup.</p>
        <SignUpForm />
        <p className="mt-0" style={{ fontSize: "var(--fs-14)", textAlign: "center" }}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
