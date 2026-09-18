# Talwalkar Growth Customer UX

**Date:** September 17, 2026  
**Status:** IMPLEMENTED  
**Type:** Customer-specific commercial plan assignment  

---

## 1. Overview

Talwalkar Gym is a real, paying customer — not a demo or test tenant. This document records the Growth plan assignment applied to the Talwalkar tenant and explains why the entire UX changes flow automatically from a single database record update.

---

## 2. Talwalkar Canonical Identity

| Field | Value |
|---|---|
| **Tenant ID** | `11111111-0001-0000-0000-000000000001` |
| **Tenant Name** | talwalkar gym |
| **Tenant Type** | customer |
| **is_demo** | false |
| **is_protected** | false |
| **Status** | active |
| **Active Branch ID** | `6a2a77a6-5f5b-4816-bfe2-590d61437af8` |
| **Active Branch Name** | Talwalkar Main Branch |
| **Inactive Branch** | `676e2bf8-df11-4806-b7cb-638bf88c1b79` (talwalkar, inactive — untouched) |

---

## 3. Plan Assignment

| | Before | After |
|---|---|---|
| `tenants.plan` stored value | `enterprise` | `professional` |
| Normalized plan ID | `plan_3` | `plan_2` |
| Commercial plan key | `scale` | `growth` |
| Customer UX | Scale (all features shown, including Scale-only) | Growth (Growth features unlocked, Scale features hidden) |

**The only data change made was:**
```sql
UPDATE tenants SET plan = 'professional' WHERE id = '11111111-0001-0000-0000-000000000001';
```

No other records, members, payments, attendance, biometric data, or branch configuration was modified.

---

## 4. How the UX Change Flows Automatically

The plan change triggers a cascade of automatic UX changes via the existing entitlement architecture:

```
tenants.plan = 'professional'
    ↓
normalizePlan('professional') → 'plan_2'    [lib/entitlements/evaluate.ts]
    ↓
planKeyFromTenantPlan('professional') → 'growth'    [app/(admin)/layout.tsx]
    ↓
currentPlanKey = 'growth' → passed to PortalShell → PortalSidebar
    ↓
Sidebar three-tier logic:
  isScale = false          → Scale nav items NOT shown
  isGrowthOrAbove = true   → Growth nav items shown and UNLOCKED
    ↓
evaluateFeature({ plan: 'professional', featureKey: 'crm' })
  → phaseRank('phase_2') = 2 ≤ Number('plan_2'.slice(-1)) = 2
  → allowed: true    [backend entitlement gates pass for all Growth features]
    ↓
evaluateFeature({ plan: 'professional', featureKey: 'multi_branch' })
  → phaseRank('phase_3') = 3 > 2
  → allowed: false   [Scale features correctly denied]
```

No code changes were needed. The existing architecture handles all three plans correctly.

---

## 5. Growth Features Enabled for Talwalkar

All Phase 2 / Growth features are now fully unlocked for Talwalkar:

| Feature Key | Feature Name | Status |
|---|---|---|
| `crm` | CRM & Lead Pipeline | ✅ Unlocked |
| `finance` | Finance Management | ✅ Unlocked |
| `accounting` | Accounting | ✅ Unlocked |
| `advanced_accounting` | Advanced Accounting | ✅ Unlocked |
| `pt` | PT & Trainer Management | ✅ Unlocked |
| `biometric` | Biometric Attendance | ✅ Unlocked |
| `smart_alerts` | Smart Alerts & Automation | ✅ Unlocked |
| `advanced_reports` | Advanced Reports & Exports | ✅ Unlocked |
| `gst` | GST Finance | ✅ Unlocked |
| `whatsapp` | WhatsApp & Communications | ✅ Unlocked |
| `advanced_membership` | Advanced Membership Operations | ✅ Unlocked |
| `growth_permissions` | Growth Permissions | ✅ Unlocked |
| `dietician` | Dietician Workflows | ✅ Unlocked |

---

## 6. Scale Features — Hidden from Talwalkar Normal UI

With `currentPlanKey = 'growth'`, the sidebar three-tier logic in `portal-sidebar.tsx` correctly:

- Does NOT render Scale-only nav items (Branches, Audit Logs, Revenue Intelligence, Advanced CRM Analytics, Retention Intelligence) as locked cards
- Does NOT show "Scale Plan required" messages
- Does NOT show "Upgrade to Scale" CTAs
- Simply **omits** Scale-only navigation from the sidebar entirely

If Talwalkar manually navigates to a Scale-only URL (e.g., `/admin/branches`), the middleware's `FEATURE_ROUTE_PREFIXES` check evaluates `multi_branch` entitlement → `false` → redirects to `/admin/upgrade`. This is the correct, secure behavior.

---

## 7. Entitlement Verification Results

Tested via inline node evaluation against `lib/entitlements/evaluate.ts`:

| Test | Result |
|---|---|
| `normalizePlan('professional')` | `plan_2` ✅ |
| `crm` on `professional` | `allowed: true` ✅ |
| `multi_branch` on `professional` | `allowed: false` ✅ |

Full entitlement test suite (13 tests): **all pass** ✅

---

## 8. Global Entitlement System — Unchanged

The following are completely unchanged:

- `lib/entitlements/registry.ts` — FEATURE_REGISTRY not modified
- `lib/entitlements/evaluate.ts` — normalizePlan/evaluateFeature not modified
- `lib/entitlements/server.ts` — hasCurrentFeature/assertCurrentFeature not modified
- `lib/phases/registry.ts` — System B not modified
- `middleware.ts` — route guards not modified
- `components/layout/portal-sidebar.tsx` — sidebar logic not modified
- `lib/nav/admin-nav.ts` — nav items not modified
- Any other tenant's plan or entitlement — not modified

No `if (tenantId === '...')` or `if (tenantName === 'talwalkar')` was added to any code file.

---

## 9. Other Tenants — Unchanged

| Tenant | Plan | Behavior |
|---|---|---|
| QA Tenant A | trial → plan_1/Essential | Unchanged — Growth features locked |
| QA Tenant B | trial → plan_1/Essential | Unchanged — Growth features locked |
| SyncFyre Demo | professional → plan_2/Growth | Unchanged — Growth unlocked, Scale hidden |
| demo gym | trial → plan_1/Essential (demo) | Unchanged — demo tenant unchanged |
| talwalkar gym (inactive) | professional → plan_2 | Inactive tenant — not used |

---

## 10. Data Safety Confirmation

| Check | Status |
|---|---|
| Talwalkar member records modified | ❌ None |
| Talwalkar payment records modified | ❌ None |
| Talwalkar attendance records modified | ❌ None |
| Talwalkar biometric data modified | ❌ None |
| Talwalkar branch configuration modified | ❌ None |
| Talwalkar tenant ID changed | ❌ No |
| Talwalkar converted to demo | ❌ No |
| is_demo changed | ❌ No |
| is_protected changed | ❌ No |
| Migration created | ❌ No |
| Schema changed | ❌ No |
| **Only change** | ✅ `tenants.plan`: `enterprise` → `professional` for tenant `11111111-0001-0000-0000-000000000001` |

---

## 11. Manual QA Checklist

Login as Talwalkar owner/admin and verify:

| Check | Expected |
|---|---|
| Dashboard | Loads normally, no upgrade banners |
| Sidebar | Shows Essential + Growth items; no Scale locked items |
| CRM / Leads | Accessible, no lock badge |
| Finance | Accessible, no lock badge |
| Accounting | Accessible, no lock badge |
| PT/Trainer | Accessible, no lock badge |
| Biometric/Machines | Accessible, no lock badge |
| Advanced Reports | Accessible, no lock badge |
| Branches | Not in sidebar; upgrade page shown if manually navigated |
| Audit Logs | Not in sidebar; upgrade page shown if manually navigated |
| Revenue Intelligence | Not in sidebar; locked card shown on revenue report (Growth behavior) |
| Advanced CRM Analytics | Not in sidebar; locked card shown on leads page (Growth behavior) |

---

## 12. SuperAdmin Access

SuperAdmin retains full visibility and control of the Talwalkar tenant:
- Tenant appears in SuperAdmin tenant list
- Plan field shows `professional` (Growth)
- All management operations available
- No data hidden from SuperAdmin
