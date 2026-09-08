import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";
import { getCommercialPlanTier, getCommercialRouteRule } from "@/lib/entitlements";
import { getPhaseLockedTarget } from "@/lib/phases/path";
import { SYSTEM_PHASE_NUMBERS, type SystemPhaseKey } from "@/lib/phases/registry";

const PUBLIC_PATHS = [
  "/",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/icons",
  "/syncfyre-logo.png",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/book-demo",
  "/terms",
  "/privacy",
  "/api/attendance/sync",
  "/api/cron/reminders",
  "/api/biometric",
  "/iclock",
];

const MACHINE_HOSTNAME = "machine.syncfyre.com";
const MACHINE_PATHS = ["/machine", "/api/machine", "/api/attendance/sync", "/api/biometric", "/iclock"];
const MACHINE_SESSION_COOKIE = "syncfyre_machine_session";

const PORTAL_DASHBOARD: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  owner: "/admin/dashboard",
  admin: "/admin/dashboard",
  manager: "/admin/dashboard",
  reception: "/reception/dashboard",
  trainer: "/trainer/dashboard",
  dietician: "/trainer/dashboard",
  "diet-planner": "/trainer/dashboard",
  diet_planner: "/trainer/dashboard",
  member: "/member/dashboard",
};

const PORTAL_ROLES: Record<string, string[]> = {
  "/superadmin": ["super_admin"],
  "/admin": ["owner", "admin", "manager"],
  "/reception": ["reception"],
  "/trainer": ["trainer", "dietician", "diet-planner", "diet_planner"],
  "/member": ["member"],
};

const PROTECTED_PREFIXES = Object.keys(PORTAL_ROLES);
function isOwnerOnboardingSetupRoute(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/admin/settings") return searchParams.get("tab") === "application";
  return [
    "/admin/memberships/new",
    "/admin/trainers/new",
    "/admin/staff/new",
    "/admin/machines",
  ].includes(pathname);
}


function isMachineHost(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  return host === MACHINE_HOSTNAME;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (isMachineHost(request)) {
    if (pathname === "/") return NextResponse.redirect(new URL("/machine", request.url));
    const allowed = MACHINE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!allowed) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.redirect(new URL("/machine", request.url));
    }
  }

  const isMachineRoute = pathname === "/machine" || pathname.startsWith("/machine/") || pathname === "/api/machine/attendance";
  const isMachineConnectRoute = pathname === "/machine/connect" || pathname === "/api/machine/session";
  if (isMachineRoute && !isMachineConnectRoute) {
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
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("[middleware] Unable to validate Supabase session", error);
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user) return response;

  let roleSlug = "";
  let onboardingCompletedAt: string | null = null;
  let tenantPlan: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("role:roles(slug), tenant_id")
      .eq("id", user.id)
      .single();

    const roleValue = profile?.role as { slug?: string } | { slug?: string }[] | null;
    roleSlug = Array.isArray(roleValue) ? roleValue[0]?.slug ?? "" : roleValue?.slug ?? "";

    const tenantId = (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null;
    if (tenantId) {
      const { data: tenant, error: tenantError } = await supabase.from("tenants").select("onboarding_completed_at,plan").eq("id", tenantId).maybeSingle();
      if (tenantError && !isMissingSchemaError(tenantError)) {
        console.error("[middleware] Unable to load tenant onboarding status", tenantError);
      } else {
        onboardingCompletedAt = tenant?.onboarding_completed_at ?? null;
        tenantPlan = tenant?.plan ?? null;
      }
    }
  } catch (error) {
    console.error("[middleware] Unable to load user profile", error);
  }

  const ownerNeedsOnboarding = roleSlug === "owner" && !onboardingCompletedAt;
  const isSuperAdmin = roleSlug === "super_admin";
  const commercialPlanTier = getCommercialPlanTier(tenantPlan);
  if (ownerNeedsOnboarding && pathname.startsWith("/admin") && !isOwnerOnboardingSetupRoute(request)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname === "/login" || pathname === "/register") {
    if (ownerNeedsOnboarding) return NextResponse.redirect(new URL("/onboarding", request.url));
    const dest = PORTAL_DASHBOARD[roleSlug];
    if (dest) return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname === "/onboarding") {
    if (!ownerNeedsOnboarding && roleSlug) {
      return NextResponse.redirect(new URL(PORTAL_DASHBOARD[roleSlug] ?? "/login", request.url));
    }
    return response;
  }

  if ((pathname === "/" || pathname === "/dashboard") && roleSlug) {
    if (ownerNeedsOnboarding) return NextResponse.redirect(new URL("/onboarding", request.url));
    const dest = PORTAL_DASHBOARD[roleSlug];
    if (dest) return NextResponse.redirect(new URL(dest, request.url));
  }

  const phaseGate = isSuperAdmin ? null : getPhaseLockedTarget(pathname, request.nextUrl.searchParams);
  if (phaseGate) {
    try {
      const { data: phases, error: phaseError } = await supabase
        .from("system_phases")
        .select("phase_key,phase_number,status")
        .order("phase_number", { ascending: true });

      let currentPhase: SystemPhaseKey = "PHASE_1";
      if (!phaseError && phases?.length) {
        const active = phases
          .filter((phase) => phase.status === "active")
          .reduce<{ phase_key: string; phase_number: number } | null>((highest, phase) => {
            if (!highest) return phase;
            return phase.phase_number > highest.phase_number ? phase : highest;
          }, null);
        currentPhase = (active?.phase_key as SystemPhaseKey) ?? "PHASE_1";
      } else if (phaseError && !isMissingSchemaError(phaseError)) {
        console.error("[middleware] Unable to load system phases", phaseError);
      }

      if (commercialPlanTier === "free" && SYSTEM_PHASE_NUMBERS[currentPhase] < SYSTEM_PHASE_NUMBERS[phaseGate.requiredPhase as SystemPhaseKey]) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            {
              error: "PHASE_NOT_ACTIVE",
              feature: phaseGate.featureKey,
              required_phase: phaseGate.requiredPhase,
              current_phase: currentPhase,
            },
            { status: 403 },
          );
        }
        const url = request.nextUrl.clone();
        url.pathname = "/phase-locked";
        url.searchParams.set("feature", phaseGate.featureKey);
        url.searchParams.set("name", phaseGate.featureName);
        url.searchParams.set("phase", phaseGate.requiredPhase);
        return NextResponse.redirect(url, 303);
      }
    } catch (error) {
      console.error("[middleware] Phase gate evaluation failed", error);
    }
  }

  const commercialRule = user && !isSuperAdmin ? getCommercialRouteRule(pathname) : null;
  if (commercialRule && commercialPlanTier === "free") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: `${commercialRule.featureLabel} is available on the Paid Plan.` }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/upgrade";
    url.searchParams.set("feature", commercialRule.featureLabel);
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const matchedPortal = PROTECTED_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  if (matchedPortal) {
    const allowed = PORTAL_ROLES[matchedPortal] ?? [];
    if (!allowed.includes(roleSlug)) {
      const url = request.nextUrl.clone();
      url.pathname = PORTAL_DASHBOARD[roleSlug] ?? "/login";
      if (!PORTAL_DASHBOARD[roleSlug]) url.searchParams.set("error", "account_not_configured");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
