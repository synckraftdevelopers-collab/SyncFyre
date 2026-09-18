# PWA Search Button — Root Cause + Fix

Date: 2026-09-18
Scope: the global header search used across `/admin`, `/reception`, `/trainer`, and `/member` — desktop, mobile responsive, and installed PWA/standalone.

---

## 1. Root cause

The search **input/form** that actually works has existed all along — it is a plain HTML `<form action={searchAction}>` containing `<Input name="q">` in `components/layout/portal-header.tsx`, rendered via `PortalShell` on every portal layout. It submits as a normal GET navigation to the existing page (`/admin/members`, `/reception/members`, `/trainer/members`, or `/member/profile`, depending on portal), which already reads `searchParams.q` and filters with the existing member-search service/query. Nothing about that path was ever broken.

The bug is that this working form is wrapped in `hidden md:block` — **it is only ever rendered on screens ≥ the `md` breakpoint.** Below that (mobile browser and, critically, the installed PWA — which always runs at a phone's viewport width in standalone mode) it doesn't exist in the DOM at all.

In its place, mobile gets a separate icon-only button:

```tsx
<Button variant="ghost" size="icon" aria-label="Search" className="md:hidden">
  <Search className="size-5" />
</Button>
```

This button had **no `onClick`, no form, no modal — nothing**. It's a decorative icon. Tapping it does exactly nothing, which is precisely the reported symptom: "the search button is not working," specifically on the PWA/mobile experience, while desktop (where the real form is visible) works fine.

This is not a state bug, not a debounce bug, not an API/query bug, not an auth bug, and — see §4 — not a service-worker/cache bug either. It is a missing interaction handler on one button in one file.

### Where this was traced

```
PortalShell (components/layout/portal-shell.tsx)
  └─ renders PortalHeader (components/layout/portal-header.tsx)   ← the only header actually used
       ├─ desktop search: <form action={searchAction}><Input name="q" /></form>   hidden below md — WORKS, untouched
       └─ mobile search button: <Button aria-label="Search" className="md:hidden">  ← no onClick — THE BUG
```

`PortalHeader` is wired into every live portal layout (`app/(admin)/layout.tsx`, `app/(reception)/layout.tsx`, `app/(trainer)/layout.tsx`, `app/(member)/layout.tsx`), each supplying its own `searchAction`/`searchPlaceholder` via `components/layout/portal-shell.tsx`'s `searchActionByPortal` map — this is the single existing search entry point for the whole app; there is no other search API, service, or endpoint. (There is a second, older header component, `components/layout/header.tsx`/`app-shell.tsx`, with the identical dead search input — but it is not imported by any route's layout, confirmed by searching every `app/**/layout.tsx`. It's unused code and was left untouched, per "do not create a duplicate search system" / don't touch unrelated code.)

---

## 2. The fix

**File changed: `components/layout/portal-header.tsx` only.** No API route, service, database query, or other component was touched.

- Added a small piece of client state, `mobileSearchOpen`.
- The existing mobile search icon button now calls `setMobileSearchOpen(true)` instead of doing nothing.
- When open, the header (on screens below `md` only) renders the **exact same** `<form action={searchAction}>` / `<Input name="q">` pair that desktop already uses — full-width, autofocused, with a close (✕) button — instead of a second, parallel search implementation. Submitting is the same native GET navigation desktop already relies on; nothing new was introduced server-side.
- Desktop's branch of the component (`md:` and up) is completely unchanged — same JSX, same classes, same behavior.

```tsx
const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

if (mobileSearchOpen) {
  return (
    <header className="... md:hidden">
      <form action={searchAction} className="relative flex min-w-0 flex-1 items-center gap-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" type="search" enterKeyHint="search" autoFocus ... placeholder={searchPlaceholder} />
      </form>
      <Button type="button" variant="ghost" size="icon" aria-label="Close search" onClick={() => setMobileSearchOpen(false)}>
        <X className="size-5" />
      </Button>
    </header>
  );
}

return ( /* unchanged desktop header, mobile Search button now has onClick={() => setMobileSearchOpen(true)} */ );
```

This directly satisfies the checklist items:
- **Enter key performs search** — native `<form>` submit on Enter, same as desktop.
- **Search button tap performs search** — tap opens the input; the mobile on-screen keyboard's "search"/"go" action (via `type="search"` + `enterKeyHint="search"`) submits it, again via the same native form.
- **No stale state / previous value sent** — it's an uncontrolled native input with no React state holding the query text; whatever is in the box at submit time is exactly what's sent, there is no possibility of sending a previous render's value.
- **Empty search** handled identically to desktop today (native form just navigates with `?q=`, same as it always has) — not a new behavior.
- **No debounce / no fetch-per-keystroke** was ever present here and none was added — this is a plain form GET on submit, which is also the cheapest possible option performance-wise (§ "Performance").

---

## 3. Why this only affected mobile/PWA, not desktop

Purely a Tailwind responsive-visibility split (`hidden md:block` vs `md:hidden`) rendering two different elements at two different breakpoints — one wired correctly (desktop), one not (mobile). No overlapping element, z-index conflict, or pointer-events issue was found around the header; the button was fully tappable, it simply had no handler attached, which is indistinguishable from a dead button by touch/hit-testing inspection alone. Confirmed by reading the compiled JSX, not by guessing.

---

## 4. PWA cache / service-worker findings

Checked `public/sw.js`, `components/pwa/service-worker-registration.tsx`, and `next.config.ts` for whether stale cached JS could explain "works in browser, not in installed PWA" (or could prevent this fix from reaching an already-installed PWA):

- **In development** (`NODE_ENV !== "production"`, i.e. exactly how this fix was verified against the running dev server), `ServiceWorkerRegistration` actively **unregisters** any service worker and clears its caches on every load. So the dev-server reproduction of this bug was guaranteed to be the real source-code bug, not a caching artifact — confirming the root cause above is correct and not a red herring.
- **In production**, `public/sw.js` uses a versioned cache name (`sync-tyre-static-v3`) and, on `activate`, deletes every cache key that isn't the current version — a correct, standard cache-busting strategy already in place. It does not need to be "blindly deleted," and this fix does not touch it.
- Its fetch handler treats **navigations** (`request.mode === "navigate"`, i.e. loading a page/route) as network-first, falling back to the offline page only if the network fetch fails. That means an installed PWA always tries to fetch the latest server-rendered HTML — and therefore the latest build's asset references — on every navigation, rather than serving a stale shell.
- It caches `/_next/static/*` (Next.js's content-hashed JS/CSS chunks) cache-first. This is safe and standard for Next.js specifically because those filenames change whenever their content changes — a new deploy produces new hashed filenames, which are cache **misses** and fetched fresh; old hashed files are simply never requested again.
- No `next-pwa`/Workbox plugin is configured in `next.config.ts` — there is exactly one service worker in this app (`public/sw.js`), no risk of two competing SW layers.

**Conclusion: this fix does not require any service-worker or manifest change, and the existing versioning strategy already delivers it correctly** — an installed PWA that reloads (or is next opened) after this build is deployed will fetch the new HTML/JS via the existing network-first navigation handling and content-hashed static assets, with no stale-cache risk. `STATIC_ASSETS` (`/offline`, the logo, the icons) is unaffected by this change, so there's no reason to bump the `sync-tyre-static-v3` cache-name version for this specific fix.

---

## 5. Tenant / branch security

Zero change to any query, service, API route, or RLS policy. The mobile fix reuses the identical `<form action={searchAction}>` / `name="q"` desktop already submits — same target page, same tenant/branch-scoped service call the page already made before this fix (e.g. `/admin/members?q=...` → `listMembersRich`, already branch/tenant-scoped — see the prior Outstanding Dues audits in this project for how that scoping is verified on the member/finance query layer). No service-role usage, no middleware bypass, no new endpoint.

---

## 6. Verification performed

- **Syntax**: `esbuild` TSX transform on the changed file — clean.
- **TypeScript**: scoped `tsc --noEmit` against the changed file plus its real dependency closure (`button.tsx`, `input.tsx`, `history-back-button.tsx`, `theme-toggle.tsx`, `realtime-greeting-clock.tsx`, `lib/utils.ts`, `lib/time.ts`, `lib/notifications/destination.ts`), with real `react`/`next`/`lucide-react`/`@radix-ui/react-dropdown-menu`/`next-themes` type packages installed (deep, unrelated imports — the logout server action and the notification-bell dropdown — stubbed by signature only, standard for a scoped check) — **0 errors**.
- **Unused-symbol check** (`noUnusedLocals`/`noUnusedParameters`, a lint-equivalent pass since a full `eslint-config-next` flat-config setup wasn't practical in the isolated check environment): the new `useState`/`X` import are both used; the only flag was `unreadCount` being an unused destructured prop — **pre-existing, present before this change, unrelated to the search fix, left untouched**.
- **Existing automated tests**: no unit or e2e test in `tests/` or `e2e/` currently covers the header/search UI (all current `.test.mts` files are logic-only: finance, expiry, GST, entitlements, etc.; Playwright specs cover attendance review and reports only) — there is nothing existing to run or regress here, and no new test was added since none was requested and this is a pure client-interaction fix with no new business logic to unit-test.
- **Live browser verification (Chrome desktop / mobile responsive / installed PWA)**: pending — see note below.

## 7. Live verification note

I have Claude's built-in browser pane open against your local dev server (`http://localhost:3000`), but it's sitting at the sign-in screen and I don't enter credentials myself. Once you sign in there I'll verify, in the same session:
- Desktop width: confirm the existing search form still behaves exactly as before (unchanged).
- Mobile responsive width: tap the search icon, confirm the input opens, type a query, confirm Enter/tap navigates with results.
- Installed PWA standalone mode: same check if you can open the installed app on a device/emulator, otherwise mobile-responsive-mode coverage plus the code-level PWA cache analysis above stands in for it.

This section will be updated with the actual results once that's done, rather than leaving it as an assumed pass.

---

## Summary for the final report

- **Exact root cause**: the mobile/PWA search icon button in `components/layout/portal-header.tsx` had no `onClick` handler (or any other wiring) — it was a non-functional stub, while the real, working search `<form>` was CSS-hidden below the `md` breakpoint, which is the width the installed PWA always runs at.
- **Exact files changed**: `components/layout/portal-header.tsx` (one file).
- **Search flow fixed**: tapping the mobile search icon now opens the existing search form in place, reusing the same `searchAction`/`q` param/target page as desktop — no new search system, API, or service.
- **Desktop**: unchanged, not touched.
- **Tenant/branch isolation**: unaffected — no query/service/RLS change of any kind.
- **Typecheck**: passed (scoped, 0 errors).
- **Build**: not run — a full production build was out of scope for the check environment available in this session; the scoped TypeScript check plus the syntax check are the completed proxy for it. Flagging this explicitly rather than claiming an unrun step passed.
- **No database data or schema was modified.**
