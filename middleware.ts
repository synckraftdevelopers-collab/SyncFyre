import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ─── Constants (inlined — cannot import lib/portals.ts in Edge) ───────────────

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/attendance/sync",
  "/api/cron/reminders",
];

/** Maps a role slug to the correct dashboard URL */
const PORTAL_DASHBOARD: Record<string, string> = {
  admin:      "/admin/dashboard",
  manager:    "/admin/dashboard",
  reception:  "/reception/dashboard",
  trainer:    "/trainer/dashboard",
  dietician:  "/trainer/dashboard",
  member:     "/member/dashboard",
};

/** Maps a portal prefix to the roles permitted inside it */
const PORTAL_ROLES: Record<string, string[]> = {
  "/admin":     ["admin", "manager"],
  "/reception": ["reception"],
  "/trainer":   ["trainer", "dietician"],
  "/member":    ["member"],
};

const PROTECTED_PREFIXES = Object.keys(PORTAL_ROLES);

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // 1. Unauthenticated user hitting a protected route → login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // For the rest we need the user's role — fetch it from the DB.
  // Only do this when the user is authenticated and hits a meaningful route.
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role:roles(slug)")
      .eq("id", user.id)
      .single();

    const roleSlug: string =
      (profile?.role as unknown as { slug: string } | null)?.slug ?? "";

    // 2. Authenticated user on login → redirect to their portal dashboard
    if (pathname === "/login") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 3. Root / and old /dashboard → redirect to portal
    if (pathname === "/" || pathname === "/dashboard") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 4. Portal route accessed by wrong role → redirect to own portal
    const matchedPortal = PROTECTED_PREFIXES.find((prefix) =>
      pathname.startsWith(prefix),
    );
    if (matchedPortal) {
      const allowed = PORTAL_ROLES[matchedPortal] ?? [];
      if (!allowed.includes(roleSlug)) {
        const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
