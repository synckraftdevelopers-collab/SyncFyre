import * as XLSX from "xlsx";

export const OHLC_FIELDS = ["auto", "ignore", "symbol", "date", "open", "high", "low", "close", "volume", "instrumentName"] as const;
export type OhlcField = (typeof OHLC_FIELDS)[number];
export type OhlcRequiredField = "symbol" | "date" | "open" | "high" | "low" | "close";
export type OhlcMapping = Record<number, OhlcField>;
export type ImportOptions = { logErrors: boolean; addSymbols: boolean; calculateComposites: boolean; noQuotationData: boolean; allowNegativePrices: boolean };
export type SpreadsheetData = { fileName: string; sheetNames: string[]; selectedSheet: string; headers: string[]; rows: unknown[][]; rowCount: number; columnCount: number; worksheets: string[]; worksheet: string; columns: string[]; rawHeaders: string[]; rawRows: unknown[][]; headerRowIndex: number; rowOffset: number };
export type OhlcCandidate = { row: number; symbol: string; date: string; open: number; high: number; low: number; close: number; volume: number | null; instrumentName: string | null; originalData: string };
export type OhlcError = { row: number; symbol: string; date: string; error: string; originalData: string };

const aliases: Record<Exclude<OhlcField, "auto" | "ignore">, string[]> = {
  symbol: ["SYMBOL", "SCRIP", "SCRIPT", "TICKER", "CODE"],
  date: ["DATE", "TRADING_DATE", "TRADE_DATE", "TIMESTAMP"],
  open: ["OPEN", "OPEN_PRICE"], high: ["HIGH", "HIGH_PRICE"], low: ["LOW", "LOW_PRICE"],
  close: ["CLOSE", "CLOSE_PRICE", "LAST"], volume: ["VOLUME", "VOL", "TRADED_VOLUME"],
  instrumentName: ["INSTRNM", "INSTRUMENT", "INSTRUMENT_NAME", "COMPANY_NAME", "NAME"],
};

function header(value: unknown) { return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function text(value: unknown) { return String(value ?? "").trim(); }

export function autoDetectMapping(columns: string[]): OhlcMapping {
  return Object.fromEntries(columns.map((column, index) => {
    const normalized = header(column);
    const field = (Object.entries(aliases).find(([, names]) => names.includes(normalized))?.[0] ?? "auto") as OhlcField;
    return [index, field];
  }));
}

export function missingRequired(mapping: OhlcMapping): OhlcRequiredField[] {
  const selected = new Set(Object.values(mapping));
  const required: OhlcRequiredField[] = ["symbol", "date", "open", "high", "low", "close"];
  return required.filter((field) => !selected.has(field));
}

function isHeaderCandidate(row: unknown[]): number {
  const values = row.map(header).filter(Boolean);
  if (!values.length) return 0;
  const matches = values.filter((value) => Object.values(aliases).some((names) => names.includes(value))).length;
  return matches >= 2 ? matches * 100 + values.length : values.length >= 4 ? values.length : 0;
}

function parseWorksheet(buffer: ArrayBuffer, fileName: string, worksheet?: string, separator = ",", skipFirst = 0) {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = XLSX.read(buffer, { type: "array", FS: isCsv ? separator : undefined, raw: true, cellDates: false });
  const selected = worksheet && workbook.Sheets[worksheet] ? worksheet : workbook.SheetNames[0];
  if (!selected) throw new Error("The spreadsheet has no worksheets.");
  const table = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[selected], { header: 1, defval: "", raw: true });
  const startAt = Math.max(0, skipFirst);
  let headerRowIndex = -1; let bestScore = 0;
  for (let index = startAt; index < table.length; index += 1) {
    const score = isHeaderCandidate(table[index] ?? []);
    if (score > bestScore) { bestScore = score; headerRowIndex = index; }
    if (score >= 200) break;
  }
  if (headerRowIndex < 0 || !table[headerRowIndex]?.some((value) => text(value))) throw new Error("No column headers were detected.");
  const rawHeaders = table[headerRowIndex].map((value, index) => text(value) || `Column ${index + 1}`);
  const rawRows = table.slice(headerRowIndex + 1).filter((row) => row.some((value) => text(value)));
  return { worksheets: workbook.SheetNames, worksheet: selected, rawHeaders, rawRows, headerRowIndex };
}

export function parseSpreadsheet(buffer: ArrayBuffer, fileName: string, worksheet?: string, separator = ",", skipFirst = 0): SpreadsheetData {
  const parsed = parseWorksheet(buffer, fileName, worksheet, separator, skipFirst);
  return { fileName, sheetNames: parsed.worksheets, selectedSheet: parsed.worksheet, headers: parsed.rawHeaders, rows: parsed.rawRows, rowCount: parsed.rawRows.length, columnCount: parsed.rawHeaders.length, ...parsed, columns: parsed.rawHeaders, rowOffset: parsed.headerRowIndex + 2 };
}

export function parseAllSpreadsheetRows(buffer: ArrayBuffer, fileName: string, worksheet: string, separator = ",", skipFirst = 0): { columns: string[]; rows: unknown[][]; rowOffset: number } {
  const parsed = parseWorksheet(buffer, fileName, worksheet, separator, skipFirst);
  return { columns: parsed.rawHeaders, rows: parsed.rawRows, rowOffset: parsed.headerRowIndex + 2 };
}
export function normalizeDate(value: unknown): string | null {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = text(value);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.includes(",") && raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueAt(row: unknown[], mapping: OhlcMapping, field: OhlcField) { const index = Object.entries(mapping).find(([, value]) => value === field)?.[0]; return index === undefined ? undefined : row[Number(index)]; }
function original(row: unknown[]) { return row.map((value) => JSON.stringify(value ?? "")).join(","); }

export function validateOhlcRows(rows: unknown[][], rowOffset: number, mapping: OhlcMapping, options: ImportOptions): { candidates: OhlcCandidate[]; errors: OhlcError[] } {
  const candidates: OhlcCandidate[] = []; const errors: OhlcError[] = []; const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (!row.some((value) => text(value))) return;
    const rowNumber = rowOffset + index; const originalData = original(row);
    const symbol = text(valueAt(row, mapping, "symbol")).toUpperCase(); const date = normalizeDate(valueAt(row, mapping, "date"));
    const open = parseNumber(valueAt(row, mapping, "open")); const high = parseNumber(valueAt(row, mapping, "high")); const low = parseNumber(valueAt(row, mapping, "low")); const close = parseNumber(valueAt(row, mapping, "close"));
    const volumeValue = valueAt(row, mapping, "volume"); const volume = text(volumeValue) ? parseNumber(volumeValue) : null;
    const instrumentName = text(valueAt(row, mapping, "instrumentName")) || null;
    const fail = (error: string) => errors.push({ row: rowNumber, symbol, date: date ?? "", error, originalData });
    if (!symbol) return fail("Symbol is required."); if (!date) return fail("Date must be YYYYMMDD, YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY.");
    if (open === null || high === null || low === null || close === null) return fail("Open, High, Low, and Close must be numeric.");
    if (volumeValue !== undefined && text(volumeValue) && volume === null) return fail("Volume must be numeric when provided.");
    if (!options.allowNegativePrices && [open, high, low, close].some((value) => value < 0)) return fail("Negative prices are not allowed.");
    if (high < open) return fail("High is lower than Open."); if (high < close) return fail("High is lower than Close."); if (low > open) return fail("Low is greater than Open."); if (low > close) return fail("Low is greater than Close.");
    const key = `${symbol}|${date}`; if (seen.has(key)) return fail("Duplicate Symbol + Date in this file."); seen.add(key);
    candidates.push({ row: rowNumber, symbol, date, open, high, low, close, volume, instrumentName, originalData });
  });
  return { candidates, errors };
}

export function errorReport(errors: OhlcError[]) { return ["Row,Symbol,Date,Error,Original Data", ...errors.map((item) => [item.row, item.symbol, item.date, item.error, item.originalData].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n"); }