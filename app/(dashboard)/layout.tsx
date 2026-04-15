import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/db/queries";
import { signOut } from "@/app/(auth)/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden />
          creem/next
        </Link>

        <nav aria-label="Dashboard">
          <Link href="/dashboard">Overview</Link>
          <Link href="/billing">Billing</Link>
          <Link href="/credits">Credits</Link>
          <Link href="/settings">Settings</Link>
        </nav>

        <footer style={{ marginTop: "auto" }}>
          <p className="mb-0" style={{ fontSize: "var(--fs-12)" }}>
            Signed in as
          </p>
          <p className="mb-0 mono" style={{ fontSize: "var(--fs-12)", wordBreak: "break-all" }}>
            {user.email}
          </p>
          <form action={signOut} style={{ marginTop: "var(--sp-3)" }}>
            <button type="submit" className="btn btn-ghost btn-block">
              Sign out
            </button>
          </form>
        </footer>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
