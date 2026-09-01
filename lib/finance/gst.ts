export type GstKind = "none" | "intra" | "inter";
export type GstPricingMode = "exclusive" | "inclusive";

export interface GstComputationInput {
  grossAmount: number;
  gstRate: number;
  pricingMode: GstPricingMode;
  gymState: string | null;
  customerState: string | null;
}

export interface GstBreakdown {
  pricingMode: GstPricingMode;
  gstKind: GstKind;
  gstApplicable: boolean;
  gstRate: number;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  grandTotal: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeState(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function resolveGstKind(gymState: string | null, customerState: string | null): GstKind {
  const source = normalizeState(gymState);
  const target = normalizeState(customerState);
  if (!source || !target) return "intra";
  return source === target ? "intra" : "inter";
}

export function calculateGstBreakdown(input: GstComputationInput): GstBreakdown {
  const grossAmount = roundMoney(Math.max(0, input.grossAmount));
  const gstRate = roundMoney(Math.max(0, input.gstRate));

  if (gstRate <= 0 || grossAmount <= 0) {
    return {
      pricingMode: input.pricingMode,
      gstKind: "none",
      gstApplicable: false,
      gstRate,
      taxableAmount: grossAmount,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      gstAmount: 0,
      grandTotal: grossAmount,
    };
  }

  const gstKind = resolveGstKind(input.gymState, input.customerState);
  const taxableAmount = input.pricingMode === "inclusive"
    ? roundMoney(grossAmount / (1 + gstRate / 100))
    : grossAmount;
  const grandTotal = input.pricingMode === "inclusive"
    ? grossAmount
    : roundMoney(taxableAmount + (taxableAmount * gstRate) / 100);
  const gstAmount = roundMoney(grandTotal - taxableAmount);

  if (gstKind === "inter") {
    return {
      pricingMode: input.pricingMode,
      gstKind,
      gstApplicable: true,
      gstRate,
      taxableAmount,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: gstAmount,
      gstAmount,
      grandTotal,
    };
  }

  const halfRate = roundMoney(gstRate / 2);
  const cgstAmount = roundMoney(gstAmount / 2);
  const sgstAmount = roundMoney(gstAmount - cgstAmount);

  return {
    pricingMode: input.pricingMode,
    gstKind,
    gstApplicable: true,
    gstRate,
    taxableAmount,
    cgstRate: halfRate,
    sgstRate: halfRate,
    igstRate: 0,
    cgstAmount,
    sgstAmount,
    igstAmount: 0,
    gstAmount,
    grandTotal,
  };
}
