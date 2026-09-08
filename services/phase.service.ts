import { createClient } from "@/lib/supabase/server";
import { getTenantCommercialPlanTier } from "@/services/entitlements.service";
import {
  FEATURE_REGISTRY,
  SYSTEM_PHASE_KEYS,
  SYSTEM_PHASE_NAMES,
  SYSTEM_PHASE_NUMBERS,
  type PhaseFeatureDefinition,
  type PhaseFeatureKey,
  type PhaseRecordStatus,
  type SystemPhaseKey,
} from "@/lib/phases/registry";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type SystemPhaseRecord = {
  id: string;
  phase_key: SystemPhaseKey;
  name: string;
  phase_number: number;
  description: string | null;
  status: PhaseRecordStatus;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FeaturePhaseRecord = {
  feature_key: PhaseFeatureKey;
  name: string;
  phase: SystemPhaseKey;
  phase_number: number;
  status: PhaseRecordStatus;
};

export type PhaseAccessDecision = {
  allowed: boolean;
  reason?: "PHASE_NOT_ACTIVE" | "FEATURE_UNKNOWN" | "TENANT_NOT_FOUND" | "PERMISSION_DENIED" | "PLAN_NOT_ENABLED";
  feature?: PhaseFeatureKey;
  required_phase?: SystemPhaseKey | null;
  current_phase?: SystemPhaseKey;
  required_phase_number?: number | null;
  current_phase_number?: number;
  message?: string;
};

export type PhaseSnapshot = {
  currentPhase: SystemPhaseRecord;
  phases: SystemPhaseRecord[];
  features: FeaturePhaseRecord[];
  featureMap: Record<PhaseFeatureKey, FeaturePhaseRecord>;
};

function isMissingRelationError(message: string | undefined) {
  const value = (message ?? "").toLowerCase();
  return value.includes("could not find the table") || value.includes("relation") && value.includes("does not exist") || value.includes("schema cache");
}

function defaultPhaseRecords(): SystemPhaseRecord[] {
  const now = new Date().toISOString();
  return SYSTEM_PHASE_KEYS.map((phaseKey) => ({
    id: phaseKey,
    phase_key: phaseKey,
    name: SYSTEM_PHASE_NAMES[phaseKey],
    phase_number: SYSTEM_PHASE_NUMBERS[phaseKey],
    description: null,
    status: phaseKey === "PHASE_1" ? "active" : "locked",
    activated_at: phaseKey === "PHASE_1" ? now : null,
    created_at: now,
    updated_at: now,
  }));
}

function hydrateFeature(definition: PhaseFeatureDefinition, currentPhase: SystemPhaseKey): FeaturePhaseRecord {
  return {
    feature_key: definition.feature_key,
    name: definition.name,
    phase: definition.phase,
    phase_number: SYSTEM_PHASE_NUMBERS[definition.phase],
    status: SYSTEM_PHASE_NUMBERS[currentPhase] >= SYSTEM_PHASE_NUMBERS[definition.phase] ? "active" : "locked",
  };
}

function getHighestActivePhase(phases: SystemPhaseRecord[]) {
  const activePhases = phases.filter((phase) => phase.status === "active");
  return activePhases.reduce<SystemPhaseRecord | null>((highest, phase) => {
    if (!highest) return phase;
    return phase.phase_number > highest.phase_number ? phase : highest;
  }, null);
}

export async function getSystemPhases(): Promise<SystemPhaseRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_phases")
    .select("id,phase_key,name,phase_number,description,status,activated_at,created_at,updated_at")
    .order("phase_number", { ascending: true });
  if (error) {
    if (isMissingRelationError(error.message)) return defaultPhaseRecords();
    throw new Error(error.message);
  }
  if (!data?.length) return defaultPhaseRecords();
  const known = new Set(SYSTEM_PHASE_KEYS);
  const rows = (data as SystemPhaseRecord[]).filter((row) => known.has(row.phase_key as SystemPhaseKey));
  return rows.length ? rows : defaultPhaseRecords();
}

export async function getCurrentPhase(): Promise<SystemPhaseRecord> {
  const phases = await getSystemPhases();
  const active = getHighestActivePhase(phases);
  return active ?? phases[0] ?? defaultPhaseRecords()[0];
}

export async function getFeaturePhase(featureKey: PhaseFeatureKey): Promise<FeaturePhaseRecord | null> {
  const currentPhase = await getCurrentPhase();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_phases")
    .select("feature_key,phase_id,system_phases!inner(phase_key,name,phase_number,status)")
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error.message)) throw new Error(error.message);
    const fallback = FEATURE_REGISTRY[featureKey];
    return fallback ? hydrateFeature(fallback, currentPhase.phase_key) : null;
  }

  if (!data) {
    const fallback = FEATURE_REGISTRY[featureKey];
    return fallback ? hydrateFeature(fallback, currentPhase.phase_key) : null;
  }

  const phaseRow = Array.isArray((data as { system_phases?: unknown }).system_phases)
    ? (data as { system_phases?: Array<{ phase_key?: SystemPhaseKey; phase_number?: number; status?: PhaseRecordStatus }> }).system_phases?.[0]
    : (data as { system_phases?: { phase_key?: SystemPhaseKey; phase_number?: number; status?: PhaseRecordStatus } | null }).system_phases ?? null;

  if (!phaseRow?.phase_key) {
    const fallback = FEATURE_REGISTRY[featureKey];
    return fallback ? hydrateFeature(fallback, currentPhase.phase_key) : null;
  }

  return {
    feature_key: featureKey,
    name: FEATURE_REGISTRY[featureKey]?.name ?? featureKey,
    phase: phaseRow.phase_key,
    phase_number: phaseRow.phase_number ?? SYSTEM_PHASE_NUMBERS[phaseRow.phase_key],
    status: SYSTEM_PHASE_NUMBERS[currentPhase.phase_key] >= (phaseRow.phase_number ?? SYSTEM_PHASE_NUMBERS[phaseRow.phase_key]) ? "active" : "locked",
  };
}

export async function getFeatureCatalog(): Promise<FeaturePhaseRecord[]> {
  const currentPhase = await getCurrentPhase();
  return Object.values(FEATURE_REGISTRY).map((definition) => hydrateFeature(definition, currentPhase.phase_key));
}

export async function getLockedFeatures() {
  return (await getFeatureCatalog()).filter((feature) => feature.status === "locked");
}

export async function getActiveFeatures() {
  return (await getFeatureCatalog()).filter((feature) => feature.status === "active");
}

export async function getPhaseSnapshot(): Promise<PhaseSnapshot> {
  const phases = await getSystemPhases();
  const currentPhase = getHighestActivePhase(phases) ?? phases[0] ?? defaultPhaseRecords()[0];
  const features = Object.values(FEATURE_REGISTRY).map((definition) => hydrateFeature(definition, currentPhase.phase_key));
  const featureMap = Object.fromEntries(features.map((feature) => [feature.feature_key, feature])) as Record<PhaseFeatureKey, FeaturePhaseRecord>;
  return { currentPhase, phases, features, featureMap };
}

export async function isPhaseEnabled(phase: SystemPhaseKey) {
  const currentPhase = await getCurrentPhase();
  return SYSTEM_PHASE_NUMBERS[currentPhase.phase_key] >= SYSTEM_PHASE_NUMBERS[phase];
}

export async function isFeatureEnabled(featureKey: PhaseFeatureKey) {
  const feature = await getFeaturePhase(featureKey);
  if (!feature) return false;
  return await isPhaseEnabled(feature.phase);
}

export async function canAccessFeature(
  tenantId: string | null | undefined,
  userId: string | null | undefined,
  featureKey: PhaseFeatureKey,
) : Promise<PhaseAccessDecision> {
  const feature = await getFeaturePhase(featureKey);
  if (!feature) {
    return { allowed: false, reason: "FEATURE_UNKNOWN", feature: featureKey, message: "Unknown feature." };
  }

  const tenantPlanTier = await getTenantCommercialPlanTier(tenantId);
  if (feature.phase === "PHASE_2" && tenantPlanTier === "free") {
    return {
      allowed: false,
      reason: "PLAN_NOT_ENABLED",
      feature: featureKey,
      required_phase: feature.phase,
      message: `${feature.name} is available on the Paid Plan.`,
    };
  }

  if (userId) {
    const supabase = await createClient();
    const { data: user, error } = await supabase.from("users").select("id,status,role:roles(slug)").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!user) {
      return { allowed: false, reason: "PERMISSION_DENIED", feature: featureKey, message: "User not found." };
    }
    if ((user as { status?: string | null }).status !== "active") {
      return { allowed: false, reason: "PERMISSION_DENIED", feature: featureKey, message: "User is inactive." };
    }
  }

  return { allowed: true };
}

export function featurePhaseNumber(featureKey: PhaseFeatureKey) {
  return SYSTEM_PHASE_NUMBERS[FEATURE_REGISTRY[featureKey].phase];
}
