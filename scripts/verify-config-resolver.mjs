import { resolveConfigValue } from "../services/config-resolver.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolved(input) {
  return resolveConfigValue(input);
}

const cases = [
  {
    name: "CASE 1 default",
    run: () => {
      const result = resolved({ branch: null, tenant: null, legacy: null, canonical: null, defaultValue: "light" });
      assert(result.value === "light", "expected default value");
      assert(result.source === "default", "expected default source");
    },
  },
  {
    name: "CASE 2 tenant",
    run: () => {
      const result = resolved({ branch: null, tenant: "light", legacy: null, canonical: null, defaultValue: "dark" });
      assert(result.value === "light", "expected tenant value");
      assert(result.source === "tenant", "expected tenant source");
    },
  },
  {
    name: "CASE 3 branch over tenant",
    run: () => {
      const result = resolved({ branch: "dark", tenant: "light", legacy: null, canonical: null, defaultValue: "system" });
      assert(result.value === "dark", "expected branch value");
      assert(result.source === "branch", "expected branch source");
    },
  },
  {
    name: "CASE 4 legacy branch beats global-derived canonical",
    run: () => {
      const result = resolved({ branch: null, tenant: null, legacy: "branch-legacy", canonical: "global-canonical", defaultValue: "default" });
      assert(result.value === "branch-legacy", "expected legacy branch/global settings layer to beat canonical");
      assert(result.source === "legacy", "expected legacy source");
    },
  },
  {
    name: "CASE 5 legacy global",
    run: () => {
      const result = resolved({ branch: null, tenant: null, legacy: "global-legacy", canonical: null, defaultValue: "default" });
      assert(result.value === "global-legacy", "expected legacy global value");
      assert(result.source === "legacy", "expected legacy source");
    },
  },
  {
    name: "CASE 6 canonical existing source",
    run: () => {
      const result = resolved({ branch: null, tenant: null, legacy: null, canonical: ["cash", "upi"], defaultValue: [] });
      assert(Array.isArray(result.value) && result.value.length === 2, "expected canonical payment modes");
      assert(result.source === "legacy", "expected canonical layer to be reported through allowed non-default source label");
    },
  },
  {
    name: "CASE 7 branch customization exists",
    run: () => {
      const result = resolved({ branch: true, tenant: false, legacy: false, canonical: false, defaultValue: false });
      assert(result.value === true, "expected branch customization value");
      assert(result.source === "branch", "expected branch source");
    },
  },
  {
    name: "CASE 8 tenant isolation by caller-provided layer set",
    run: () => {
      const tenantA = resolved({ branch: null, tenant: "tenant-a", legacy: null, canonical: null, defaultValue: "default" });
      const tenantB = resolved({ branch: null, tenant: "tenant-b", legacy: null, canonical: null, defaultValue: "default" });
      assert(tenantA.value === "tenant-a", "expected tenant A value");
      assert(tenantB.value === "tenant-b", "expected tenant B value");
      assert(tenantA.value !== tenantB.value, "tenant values must not cross");
    },
  },
];

for (const testCase of cases) {
  testCase.run();
  console.log(`PASS ${testCase.name}`);
}
