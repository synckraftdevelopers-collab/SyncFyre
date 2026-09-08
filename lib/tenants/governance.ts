export type TenantType = "customer" | "demo";

export type TenantGovernanceRecord = {
  tenant_type?: string | null;
  is_demo?: boolean | null;
  is_protected?: boolean | null;
  purpose?: string | null;
};

export function isDemoTenant(tenant: TenantGovernanceRecord | null | undefined): boolean {
  return tenant?.tenant_type === "demo" && tenant.is_demo === true;
}

export function isProtectedTenant(tenant: TenantGovernanceRecord | null | undefined): boolean {
  return tenant?.is_protected === true;
}

/** Only explicitly classified demo tenants may be used for demo/test operations. */
export function canRunDemoOperation(tenant: TenantGovernanceRecord | null | undefined): boolean {
  return isDemoTenant(tenant) && isProtectedTenant(tenant);
}

export function assertDemoOperationAllowed(tenant: TenantGovernanceRecord | null | undefined, operation: string): void {
  if (!canRunDemoOperation(tenant)) {
    throw new Error(`Denied ${operation}: tenant is not a protected Demo tenant.`);
  }
}

/** Tenant users never control SaaS-level classification or protection metadata. */
export function canManageTenantClassification(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export function normalizeTenantGovernance(input: TenantGovernanceRecord): TenantGovernanceRecord {
  const demo = input.tenant_type === "demo" && input.is_demo === true;
  return {
    ...input,
    tenant_type: demo ? "demo" : "customer",
    is_demo: demo,
    is_protected: input.is_protected === true,
  };
}
export function buildClassificationPatch(input: { tenantType: TenantType; isDemo: boolean; isProtected?: boolean }) {
  if (input.tenantType === "demo" && !input.isDemo) throw new Error("Demo tenants must set is_demo=true.");
  if (input.tenantType === "customer" && input.isDemo) throw new Error("Customer tenants must set is_demo=false.");
  const patch: { tenant_type: TenantType; is_demo: boolean; is_protected?: boolean } = { tenant_type: input.tenantType, is_demo: input.isDemo };
  if (input.isProtected !== undefined) patch.is_protected = input.isProtected;
  return patch;
}