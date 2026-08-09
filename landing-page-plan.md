# SyncFyre Landing Page — Design and Delivery Plan

**Purpose:** Replace the current unauthenticated redirect at `/` with a high-conversion marketing landing page for gym owners, while preserving the current logged-in redirect to the correct portal dashboard.

**Page audience:** Gym owners, fitness-studio operators, and multi-branch gym managers in India.  
**Primary conversion:** `Book a demo` / lead enquiry.  
**Secondary conversion:** `Sign in` for existing staff and members.

## Reference research

The plan takes product-positioning ideas from current gym-management sites, not their visual design or copy:

- [Easy Gym Software](https://easygymsoftware.com/) positions membership management, payments, biometric attendance, client plans, and WhatsApp automation as core operational benefits.
- [GoGym4U](https://www.gogym4u.com/) highlights GST-ready invoices, payments, biometric attendance, trainer/diet plans, and exports.
- [GymSupport](https://gymsupport.in/) shows the value of separate member-facing features: membership, attendance, invoices, diet plans, and workout plans.
- [GymPlus](https://gymplus.io/) reinforces a concise all-in-one story: member profiles, memberships, invoices, attendance, payments, staff, and reporting.

**SyncFyre difference:** lead with “one intelligent platform for every moving part of your gym,” then prove it through the existing Admin, Reception, Trainer, and Member portals. Do not claim integrations, WhatsApp automation, AI, or customer statistics until they are actually implemented and approved.

## Visual direction — match the existing SyncFyre theme

Use the application’s established visual language; do not imitate a competitor site.

| Element | Direction |
|---|---|
| Brand mood | Premium, operational, confident, and energetic—not a generic bodybuilding website. |
| Primary dark canvas | Navy `#061a31` / `#071d38` from the app shell. |
| Primary CTA | SyncFyre red `#ff3024`; white label; clear focus/hover states. |
| Supporting accent | Cyan `#52c7ea` used sparingly for highlights, tags, and data accents. |
| Surfaces | White/light cards on light sections; navy/blue cards on dark sections; rounded 16–24 px corners. |
| Typography | Existing Inter/system font stack; bold concise headings, short readable paragraphs. |
| Imagery | One high-quality gym/team image in the hero plus product screenshots; avoid crowded stock-photo collages. |
| Motion | Small hover and scroll-in transitions only; page must work with reduced-motion preference. |

## Page structure and approved draft copy

### 1. Sticky header

- SyncFyre logo at left.
- Nav links: `Features`, `For your team`, `How it works`, `FAQ`.
- Secondary action: `Sign in` -> `/login`.
- Primary action: `Book a demo` -> `#book-demo`.
- Mobile: logo, Sign in, menu button; keyboard-accessible menu.

### 2. Hero — dark navy

**Eyebrow:** `Gym management, finally in sync`  
**Headline:** `Run every part of your gym from one intelligent platform.`  
**Supporting text:** `Manage members, memberships, payments, attendance, trainers, fitness plans, and reports without switching between spreadsheets and disconnected tools.`  
**Primary CTA:** `Book a demo`  
**Secondary CTA:** `Explore features`

Hero visual: a polished SyncFyre dashboard composition showing cards for active members, collections, attendance, and renewals. Use a real, anonymised product screenshot once available; otherwise use an explicitly labelled product mock-up—not fake customer data.

### 3. Trust/value strip

Three short statements with icons:

- `One source of truth for every branch`
- `Role-based portals for your whole team`
- `Built for daily gym operations`

Do not include logos, ratings, customer counts, uptime, or savings claims until the business can substantiate them.

### 4. Problem-to-outcome section

Heading: `Stop chasing renewals, registers, and spreadsheets.`

Use a two-column comparison:

| Without SyncFyre | With SyncFyre |
|---|---|
| Member details scattered across registers | Complete member profile in one place |
| Missed renewals and unclear dues | Membership, invoices, and payments connected |
| Manual attendance follow-up | Attendance history and device-sync workflow |
| Trainer plans living in chats/files | Workouts, diet plans, and progress linked to members |

### 5. Core features — six cards

Each card links to a lower feature detail or future product page.

1. **Members & memberships** — profiles, plans, renewals, and expiry visibility.
2. **Billing & finance** — invoices, payments, dues, income, expenses, and reports.
3. **Attendance & devices** — check-ins, attendance history, and exception handling.
4. **Trainer workspace** — assigned members, appointments, workouts, diet plans, and progress.
5. **Member self-service** — profile, membership, attendance, appointments, and assigned plans.
6. **Reports & control** — operational snapshots, exports, and role-based access.

### 6. Role-based workspace section

Heading: `A clear workspace for every person in your gym.`

Use tabs or four adjacent cards with real UI screenshots:

| Role | Message | Key proof |
|---|---|---|
| Admin | `See the whole operation.` | Members, finance, reports, devices, staff |
| Reception | `Move the front desk faster.` | Registrations, memberships, payments, appointments |
| Trainer | `Keep every member on track.` | Assigned members, workouts, diet, progress |
| Member | `Give members a better experience.` | Membership, attendance, plans, appointments |

### 7. How it works

Three simple steps:

1. `Set up your branch, staff, and membership plans.`
2. `Bring daily operations into SyncFyre.`
3. `Keep members, payments, attendance, and plans in sync.`

### 8. Feature spotlight — billing and attendance

Use alternating image/text blocks:

- **Know what is due, paid, and overdue.** Invoice/payment workflow with an actual product image.
- **See attendance without manual registers.** Attendance/device dashboard screenshot.

Only show product functions already live or clearly label an item as “coming soon.”

### 9. FAQ

Use accessible accordion buttons. Initial questions:

- What kinds of gyms can use SyncFyre?
- Can I manage multiple branches?
- Does SyncFyre have separate access for admin, reception, trainers, and members?
- Can I manage memberships, payments, and attendance together?
- How do I request a demo?

Answers must be fact-checked against the implemented product and sales policy before launch.

### 10. Demo lead form — `#book-demo`

Required fields: name, gym/studio name, work email, phone, city, number of branches.  
Optional field: message.  
Consent checkbox: contact permission and link to privacy policy.

Submit state: inline validation, loading state, success confirmation, and recoverable failure message. Do not show the form until storage, notification recipient, spam protection, and privacy text are implemented.

### 11. Footer

Logo/tagline, product links, `Sign in`, contact email, privacy policy, terms, and copyright. Add social links only if maintained.

## Technical implementation plan

### Route behaviour

- Unauthenticated visitor at `/`: render the landing page.
- Authenticated visitor at `/`: keep current role-based redirect to the appropriate dashboard.
- `/login` remains the existing sign-in page.
- Do not make the landing page a dashboard layout child.

### Suggested file ownership — two developers, no merge conflict

| Developer | Files/folders | Work |
|---|---|---|
| Dev 1 | `app/page.tsx`, `components/landing/hero.tsx`, `features.tsx`, `roles.tsx`, `faq.tsx`, `footer.tsx` | Page composition and all display sections. |
| Dev 2 | `components/landing/header.tsx`, `demo-form.tsx`, `lib/validations/demo-lead.ts`, `app/api/demo-leads/route.ts`, `e2e/landing/` | Navigation, lead capture, validation/API, browser tests. |
| Joint, sequential handoff | `app/globals.css`, `types/index.ts`, database migration | Only if required; one developer merges first before the other starts. |

### Lead capture decision

Before implementing the form, choose one approved destination:

1. **Database lead table (recommended):** create `demo_leads` with name, gym name, contact fields, branch count, message, status, timestamps, and consent timestamp; restrict reads to authorised staff.
2. **Temporary email-only delivery:** secure server endpoint sends an email; no client-side credential; add persistence before marketing campaigns begin.

Add server-side validation, rate limiting, a honeypot field or CAPTCHA, and a privacy-policy link in either case. Do not rely on client-side validation alone.

## Asset checklist

- [ ] Transparent SyncFyre logo suitable for light and dark backgrounds.
- [ ] One approved hero gym/team image, properly licensed.
- [ ] Four anonymised, current product screenshots: Admin, Reception, Trainer, Member.
- [ ] Two detail screenshots: payments/finance and attendance.
- [ ] Favicon, Open Graph image, and social preview copy.
- [ ] Privacy policy and terms text approved before enabling lead capture.

## Definition of done and testing

### Functional tests

- [ ] Logged-out `/` loads landing page; logged-in `/` redirects to each correct portal dashboard.
- [ ] Every header/footer/CTA link targets a valid destination.
- [ ] Demo form validates required fields, rejects malformed email/phone, prevents duplicate rapid submits, and displays success/failure state.
- [ ] Lead API rejects invalid payloads, rate-limit breaches, and unauthorised reads.
- [ ] Form submission creates exactly one authorised lead record or sends exactly one approved notification.

### UI/accessibility tests

- [ ] Test Chrome, Safari, and Firefox at 360 px, 768 px, and desktop widths.
- [ ] Keyboard can reach navigation, menu, FAQ, form fields, and submit button; focus is visible.
- [ ] Images have descriptive alt text; decorative images use empty alt text.
- [ ] Heading order, labels, contrast, reduced motion, and error announcements are accessible.
- [ ] Run Lighthouse and address material performance, accessibility, best-practice, and SEO issues.

### Engineering tests

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes once lint configuration is non-interactive.
- [ ] Add a browser E2E test: logged-out home -> Book a demo -> valid form success.
- [ ] Add E2E role redirect tests for Admin, Reception, Trainer, and Member.
- [ ] Verify no production secrets, private member data, or actual customer data appears in screenshots or page source.

## Evidence log

| Date | Task | Tester | Environment | Result | PR / screenshot / issue |
|---|---|---|---|---|---|
| | Landing page and authenticated redirect | | | | |
| | CTA/navigation links | | | | |
| | Demo lead validation/API | | | | |
| | Responsive and accessibility pass | | | | |
| | E2E and typecheck | | | | |
