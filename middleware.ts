import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/billing", "/credits", "/settings"];
const AUTH_ONLY_PREFIXES = ["/sign-in", "/sign-up"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (requiresAuth && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/sign-in";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  const authRoute = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (authRoute && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every path except static assets / images / favicon / API that
    // handles its own auth. Keep the webhook path out — it doesn't need a
    // session and mustn't pay the cookie-refresh round trip.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks).*)",
  ],
};
