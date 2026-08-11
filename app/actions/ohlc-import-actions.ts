"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ImportOptions, OhlcCandidate, OhlcError } from "@/lib/market-data/ohlc-import";

const CHUNK_SIZE = 500;
export type OhlcImportRequest = { branchId: string; candidates: OhlcCandidate[]; validationErrors: OhlcError[]; options: ImportOptions };
export type OhlcImportResult = { error?: string; imported: number; duplicates: number; skipped: number; errors: OhlcError[] };

function serverValidate(candidate: OhlcCandidate, options: ImportOptions): string | null {
  if (!candidate.symbol.trim()) return "Symbol is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) return "Date is invalid.";
  if (![candidate.open, candidate.high, candidate.low, candidate.close].every(Number.isFinite)) return "Open, High, Low, and Close must be numeric.";
  if (candidate.volume !== null && !Number.isFinite(candidate.volume)) return "Volume must be numeric when provided.";
  if (!options.allowNegativePrices && [candidate.open, candidate.high, candidate.low, candidate.close].some((value) => value < 0)) return "Negative prices are not allowed.";
  if (candidate.high < candidate.open) return "High is lower than Open.";
  if (candidate.high < candidate.close) return "High is lower than Close.";
  if (candidate.low > candidate.open) return "Low is greater than Open.";
  if (candidate.low > candidate.close) return "Low is greater than Close.";
  return null;
}

export async function importOhlcAction(request: OhlcImportRequest): Promise<OhlcImportResult> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!request.branchId) return { error: "Choose a branch for this market data.", imported: 0, duplicates: 0, skipped: 0, errors: [] };
  if (profile.role?.slug === "reception" && profile.branch_id !== request.branchId) return { error: "You can only import data into your assigned branch.", imported: 0, duplicates: 0, skipped: 0, errors: [] };
  if (request.candidates.length + request.validationErrors.length > 10_000) return { error: "Import up to 10,000 rows at a time.", imported: 0, duplicates: 0, skipped: 0, errors: [] };

  const supabase = await createClient();
  const { data: branch } = await supabase.from("branches").select("id").eq("id", request.branchId).eq("status", "active").maybeSingle();
  if (!branch) return { error: "Choose an active branch.", imported: 0, duplicates: 0, skipped: 0, errors: [] };

  const errors = request.options.logErrors ? [...request.validationErrors] : [];
  const verified = request.candidates.filter((candidate) => {
    const error = serverValidate(candidate, request.options);
    if (!error) return true;
    if (request.options.logErrors) errors.push({ row: candidate.row, symbol: candidate.symbol, date: candidate.date, error, originalData: candidate.originalData });
    return false;
  });
  const symbols = [...new Set(verified.map((candidate) => candidate.symbol.trim().toUpperCase()))];
  const existingSymbolIds = new Map<string, string>();
  for (let index = 0; index < symbols.length; index += CHUNK_SIZE) {
    const { data, error } = await supabase.from("market_symbols").select("id,symbol").eq("branch_id", request.branchId).in("symbol", symbols.slice(index, index + CHUNK_SIZE));
    if (error) return { error: error.message, imported: 0, duplicates: 0, skipped: verified.length, errors };
    data?.forEach((item) => existingSymbolIds.set(item.symbol, item.id));
  }

  const unknown = verified.filter((candidate) => !existingSymbolIds.has(candidate.symbol));
  if (unknown.length && !request.options.addSymbols) {
    unknown.forEach((candidate) => request.options.logErrors && errors.push({ row: candidate.row, symbol: candidate.symbol, date: candidate.date, error: "Unknown symbol. Enable Automatically add new symbols to register it.", originalData: candidate.originalData }));
  } else if (unknown.length) {
    const newSymbols = [...new Map(unknown.map((candidate) => [candidate.symbol, candidate])).values()];
    for (let index = 0; index < newSymbols.length; index += CHUNK_SIZE) {
      const payload = newSymbols.slice(index, index + CHUNK_SIZE).map((candidate) => ({ branch_id: request.branchId, symbol: candidate.symbol, instrument_name: candidate.instrumentName, created_by: profile.id }));
      const { data, error } = await supabase.from("market_symbols").upsert(payload, { onConflict: "branch_id,symbol" }).select("id,symbol");
      if (error) return { error: error.message, imported: 0, duplicates: 0, skipped: verified.length, errors };
      data?.forEach((item) => existingSymbolIds.set(item.symbol, item.id));
    }
  }

  const importable = verified.filter((candidate) => existingSymbolIds.has(candidate.symbol));
  const duplicateKeys = new Set<string>();
  const symbolIds = [...new Set(importable.map((candidate) => existingSymbolIds.get(candidate.symbol)).filter((id): id is string => Boolean(id)))];
  const dates = [...new Set(importable.map((candidate) => candidate.date))];
  for (let index = 0; index < symbolIds.length; index += CHUNK_SIZE) {
    const { data, error } = await supabase.from("ohlc_records").select("symbol_id,trading_date").eq("branch_id", request.branchId).in("symbol_id", symbolIds.slice(index, index + CHUNK_SIZE)).in("trading_date", dates);
    if (error) return { error: error.message, imported: 0, duplicates: 0, skipped: verified.length, errors };
    data?.forEach((item) => duplicateKeys.add(`${item.symbol_id}|${item.trading_date}`));
  }

  let imported = 0; let duplicates = 0;
  const records = importable.filter((candidate) => {
    const key = `${existingSymbolIds.get(candidate.symbol)}|${candidate.date}`;
    if (!duplicateKeys.has(key)) return true;
    duplicates += 1;
    if (request.options.logErrors) errors.push({ row: candidate.row, symbol: candidate.symbol, date: candidate.date, error: "Duplicate OHLC record for Symbol + Date.", originalData: candidate.originalData });
    return false;
  });
  if (!request.options.noQuotationData) {
    for (let index = 0; index < records.length; index += CHUNK_SIZE) {
      const batch = records.slice(index, index + CHUNK_SIZE).map((candidate) => ({ branch_id: request.branchId, symbol_id: existingSymbolIds.get(candidate.symbol), trading_date: candidate.date, open: candidate.open, high: candidate.high, low: candidate.low, close: candidate.close, volume: candidate.volume, composite: request.options.calculateComposites ? (candidate.open + candidate.high + candidate.low + candidate.close) / 4 : null, imported_by: profile.id }));
      const { error } = await supabase.from("ohlc_records").insert(batch);
      if (error) return { error: error.message, imported, duplicates, skipped: request.candidates.length - imported - duplicates, errors };
      imported += batch.length;
    }
  }
  await supabase.from("activity_logs").insert({ user_id: profile.id, branch_id: request.branchId, action: "ohlc_import", entity_type: "ohlc_records", description: request.options.noQuotationData ? "Market symbols imported without quotation data" : "OHLC data imported", changes: { imported, duplicates, calculate_composites: request.options.calculateComposites, no_quotation_data: request.options.noQuotationData } });
  revalidatePath("/admin/members"); revalidatePath("/reception/members");
  return { imported, duplicates, skipped: request.candidates.length - imported - duplicates, errors };
}
export async function previewOhlcImportAction(request: Pick<OhlcImportRequest, "branchId" | "candidates" | "options">): Promise<{ error?: string; ready: number; duplicates: number; errors: OhlcError[] }> {
  const profile = await requireUser(["admin", "manager", "reception"]);
  if (!request.branchId || (profile.role?.slug === "reception" && profile.branch_id !== request.branchId)) return { error: "You cannot validate market data for this branch.", ready: 0, duplicates: 0, errors: [] };
  const supabase = await createClient();
  const symbols = [...new Set(request.candidates.map((candidate) => candidate.symbol))];
  const { data: symbolRows, error: symbolError } = await supabase.from("market_symbols").select("id,symbol").eq("branch_id", request.branchId).in("symbol", symbols);
  if (symbolError) return { error: symbolError.message, ready: 0, duplicates: 0, errors: [] };
  const symbolIds = new Map((symbolRows ?? []).map((item) => [item.symbol, item.id]));
  const errors: OhlcError[] = []; const blocked = new Set<number>();
  if (!request.options.addSymbols) request.candidates.forEach((candidate, index) => { if (!symbolIds.has(candidate.symbol)) { blocked.add(index); errors.push({ row: candidate.row, symbol: candidate.symbol, date: candidate.date, error: "Unknown symbol. Enable Automatically add new symbols to register it.", originalData: candidate.originalData }); } });
  const ids = [...symbolIds.values()]; const dates = [...new Set(request.candidates.map((candidate) => candidate.date))];
  if (ids.length && dates.length) {
    const { data: recordRows, error: recordError } = await supabase.from("ohlc_records").select("symbol_id,trading_date").eq("branch_id", request.branchId).in("symbol_id", ids).in("trading_date", dates);
    if (recordError) return { error: recordError.message, ready: 0, duplicates: 0, errors: [] };
    const existing = new Set((recordRows ?? []).map((item) => `${item.symbol_id}|${item.trading_date}`));
    request.candidates.forEach((candidate, index) => { const symbolId = symbolIds.get(candidate.symbol); if (symbolId && existing.has(`${symbolId}|${candidate.date}`)) { blocked.add(index); errors.push({ row: candidate.row, symbol: candidate.symbol, date: candidate.date, error: "Duplicate OHLC record for Symbol + Date.", originalData: candidate.originalData }); } });
  }
  return { ready: request.candidates.length - blocked.size, duplicates: errors.filter((item) => item.error.startsWith("Duplicate")).length, errors };
}
