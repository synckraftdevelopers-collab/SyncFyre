import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Constants (inlined ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cannot import lib/portals.ts in Edge) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api/attendance/sync",
  "/api/cron/reminders",

  // Biometric machine communication
  "/api/biometric",
  "/iclock",
];

const MACHINE_HOSTNAME = "machine.syncfyre.com";
const MACHINE_PATHS = ["/machine", "/api/machine", "/api/attendance/sync", "/api/biometric", "/iclock"];
const MACHINE_SESSION_COOKIE = "syncfyre_machine_session";

function isMachineHost(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
  return host === MACHINE_HOSTNAME;
}

/** Maps a role slug to the correct dashboard URL */
const PORTAL_DASHBOARD: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  admin:      "/admin/dashboard",
  manager:    "/admin/dashboard",
  reception:  "/reception/dashboard",
  trainer:    "/trainer/dashboard",
  dietician:  "/trainer/dashboard",
  "diet-planner": "/trainer/dashboard",
  diet_planner: "/trainer/dashboard",
  member:     "/member/dashboard",
};

/** Maps a portal prefix to the roles permitted inside it */
const PORTAL_ROLES: Record<string, string[]> = {
  "/superadmin": ["super_admin"],
  "/admin":     ["admin", "manager"],
  "/reception": ["reception"],
  "/trainer":   ["trainer", "dietician", "diet-planner", "diet_planner"],
  "/member":    ["member"],
};

const PROTECTED_PREFIXES = Object.keys(PORTAL_ROLES);

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Middleware ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // The machine subdomain is terminal-only. It cannot serve management UI or APIs.
  if (isMachineHost(request)) {
    if (pathname === "/") return NextResponse.redirect(new URL("/machine", request.url));
    const allowed = MACHINE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!allowed) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.redirect(new URL("/machine", request.url));
    }
  }

  // Machine terminals have a distinct, host-only device session. Do this before
  // Supabase auth so a terminal is never sent to the Gym Admin login page.
  const isMachineRoute = pathname === "/machine" || pathname.startsWith("/machine/") || pathname === "/api/machine/attendance";
  const isMachineConnectRoute = pathname === "/machine/connect" || pathname === "/api/machine/session";
  if (isMachineRoute && !isMachineConnectRoute) {
    // The route/page independently verifies the signed cookie. This inexpensive
    // check only selects the correct authentication flow at the Edge.
    if (!request.cookies.get(MACHINE_SESSION_COOKIE)?.value) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Machine authentication required." }, { status: 401 });
      return NextResponse.redirect(new URL("/machine/connect", request.url));
    }
    return NextResponse.next({ request });
  }
  if (isMachineConnectRoute) return NextResponse.next({ request });
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

  // 1. Unauthenticated user hitting a protected route ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // For the rest we need the user's role ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fetch it from the DB.
  // Only do this when the user is authenticated and hits a meaningful route.
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role:roles(slug)")
      .eq("id", user.id)
      .single();

    const roleSlug: string =
      ((Array.isArray(profile?.role) ? (profile?.role as unknown as { slug?: string }[])[0] : profile?.role) as unknown as { slug?: string } | null)?.slug ?? "";

    // 2. Authenticated user on login ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ redirect to their portal dashboard
    if (pathname === "/login") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 3. Root / and old /dashboard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ redirect to portal
    if (pathname === "/" || pathname === "/dashboard") {
      const dest = PORTAL_DASHBOARD[roleSlug] ?? "/admin/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // 4. Portal route accessed by wrong role ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ redirect to own portal
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
