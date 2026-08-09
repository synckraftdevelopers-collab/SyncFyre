import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// â”€â”€â”€ Constants (inlined â€” cannot import lib/portals.ts in Edge) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  const pathname = request.nextUrl.pathname;

  // `getUser()` validates a session with Supabase. It can throw when a browser
  // has an old or corrupt auth cookie. Do not let that turn the public login
  // page into a 500 response.
  let user = null;
  try {
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    user = authenticatedUser;
  } catch (error) {
    console.error("[middleware] Unable to validate Supabase session", error);
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // 1. Unauthenticated user hitting a protected route â†’ login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // For the rest we need the user's role â€” fetch it from the DB.
  // Only do this when the user is authenticated and hits a meaningful route.
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role:roles(slug)")
      .eq("id", user.id)
      .single();

    const roleSlug: string =
      (profile?.role as unknown as { slug: string } | null)?.slug ?? "";

    // 2. Authenticated user on login â†’ redirect to their portal dashboard
    if (pathname === "/login") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 3. Root / and old /dashboard â†’ redirect to portal
    if (pathname === "/" || pathname === "/dashboard") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 4. Portal route accessed by wrong role â†’ redirect to own portal
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
