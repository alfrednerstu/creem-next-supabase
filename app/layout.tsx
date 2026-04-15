import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creem × Supabase SaaS Starter",
  description:
    "A production-ready Next.js 14 starter with Supabase auth and Creem payments — subscriptions, credits, portal, webhooks.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
