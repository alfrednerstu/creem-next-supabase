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
          Template
        </Link>

        <nav aria-label="Dashboard">
          <Link href="/dashboard">Overview</Link>
          <Link href="/billing">Billing</Link>
          <Link href="/credits">Credits</Link>
          <Link href="/settings">Settings</Link>
        </nav>

        <footer className="sidebar-footer">
          <div className="sidebar-user">
            <p className="mb-0" style={{ fontSize: "var(--fs-12)" }}>
              Signed in as{" "}
              <span className="mono" style={{ wordBreak: "break-all" }}>
                {user.email}
              </span>
            </p>
          </div>
          <form action={signOut} className="sidebar-signout">
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
