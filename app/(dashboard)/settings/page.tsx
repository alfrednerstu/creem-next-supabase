import { getProfile, getSessionUser } from "@/lib/db/queries";
import UpdateProfileForm from "./UpdateProfileForm";

export const metadata = { title: "Settings · Template" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await getProfile(user.id);

  return (
    <>
      <header style={{ marginBottom: "var(--sp-8)" }}>
        <h2 style={{ marginBottom: "0.5em" }}>Settings</h2>
        <p className="muted mb-0">Profile and account details.</p>
      </header>

      <section className="card" style={{ maxWidth: 560 }}>
        <header>
          <h4 className="mb-0">Profile</h4>
        </header>
        <UpdateProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            email: profile?.email ?? user.email ?? "",
          }}
        />
      </section>
    </>
  );
}
