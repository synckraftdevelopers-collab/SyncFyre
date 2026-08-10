"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { memberSchema, type MemberInput } from "@/lib/validations/member";

export type MemberImportState = {
  error?: string;
  imported?: number;
  skipped?: number;
  errors?: string[];
};

type SheetRow = Record<string, unknown>;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const INSERT_CHUNK_SIZE = 500;

function normalizedHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cell(row: SheetRow, names: string[]) {
  const accepted = names.map(normalizedHeader);
  for (const [key, value] of Object.entries(row)) {
    const header = normalizedHeader(key);
    const matches = accepted.some((name) =>
      header === name || (name.length >= 4 && (header.includes(name) || name.includes(header))),
    );
    if (matches && value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}
function optional(value: string) {
  return value || null;
}

function phone(value: string) {
  return value.replace(/(?!^)\+|[^\d+]/g, "");
}

function isoDate(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const [, day, month, yearPart] = match;
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
}

function gender(value: string) {
  const normalized = value.toLowerCase().trim();
  if (["male", "m"].includes(normalized)) return "male";
  if (["female", "f"].includes(normalized)) return "female";
  if (["other", "o"].includes(normalized)) return "other";
  if (["prefer not to say", "prefer_not_to_say", "na", "n/a"].includes(normalized)) return "prefer_not_to_say";
  return value || null;
}

function status(value: string) {
  return value.toLowerCase() === "inactive" ? "inactive" : "active";
}

function toNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : value;
}

function importRow(row: SheetRow, branchId: string): Record<string, unknown> {
  return {
    full_name: cell(row, ["full name", "name", "member name", "member", "customer name", "client name"]),
    phone: phone(cell(row, ["phone", "phone number", "phone no", "mobile", "mobile number", "mobile no", "contact number", "contact no", "contact"])),
    email: optional(cell(row, ["email", "email address"])),
    gender: gender(cell(row, ["gender"])),
    date_of_birth: isoDate(cell(row, ["date of birth", "dob", "birth date"])),
    address: optional(cell(row, ["address"])),
    emergency_contact_name: optional(cell(row, ["emergency contact name", "emergency name"])),
    emergency_contact_phone: optional(phone(cell(row, ["emergency contact phone", "emergency phone"]))),
    height_cm: toNumber(cell(row, ["height", "height cm", "heightcm"])),
    weight_kg: toNumber(cell(row, ["weight", "weight kg", "weightkg"])),
    blood_group: optional(cell(row, ["blood group", "bloodgroup"])),
    medical_conditions: optional(cell(row, ["medical conditions", "medical condition", "medical"])),
    fitness_goal: optional(cell(row, ["fitness goal", "goal"])),
    branch_id: branchId,
    status: status(cell(row, ["status"])),
  };
}

export async function importMembersAction(
  _: MemberImportState,
  formData: FormData,
): Promise<MemberImportState> {
  await requireUser(["admin", "manager"]);
  const file = formData.get("file");
  const branchId = String(formData.get("branch_id") ?? "");

  if (!(file instanceof File) || file.size === 0) return { error: "Choose an Excel or CSV file to import." };
  if (file.size > MAX_FILE_SIZE) return { error: "The file must be 10 MB or smaller." };
  if (!branchId) return { error: "Choose the branch that these members belong to." };

  let rows: SheetRow[];
  let headerRowIndex = -1;
  let memberSheet: XLSX.WorkSheet | undefined;
  try {
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: false });
    const isHeader = (headers: string[], names: string[]) => names.some((label) => {
      const name = normalizedHeader(label);
      return headers.some((header) => header === name || (name.length >= 4 && (header.includes(name) || name.includes(header))));
    });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
      const candidateHeaderRow = table.findIndex((row) => {
        const headers = row.map((value) => normalizedHeader(String(value)));
        return isHeader(headers, ["full name", "name", "member name", "member", "customer name", "client name"]) &&
          isHeader(headers, ["phone", "phone number", "phone no", "mobile", "mobile number", "mobile no", "contact number", "contact no", "contact"]);
      });
      if (candidateHeaderRow >= 0) {
        memberSheet = sheet;
        headerRowIndex = candidateHeaderRow;
        break;
      }
    }
    rows = memberSheet ? XLSX.utils.sheet_to_json<SheetRow>(memberSheet, { range: headerRowIndex, defval: "", raw: true }) : [];  } catch {
    return { error: "We could not read this file. Upload a valid .xlsx, .xls, or .csv spreadsheet." };
  }

  if (headerRowIndex < 0) return { error: "Could not locate the header row. Include Name and Phone (or Mobile/Contact No) columns in the sheet." };
  if (!rows.length) return { error: "No member rows were found below the column headers." };
  if (rows.length > 10_000) return { error: "Import up to 10,000 members at a time." };

  const errors: string[] = [];
  const candidates: { member: MemberInput; rowNumber: number }[] = [];
  const uploadedPhones = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = headerRowIndex + index + 2;
    const rawMember = importRow(row, branchId);
    if (!String(rawMember.full_name ?? "").trim()) {
      errors.push(`Row ${rowNumber}: Full name is required.`);
      return;
    }
    if (!String(rawMember.phone ?? "").trim()) {
      errors.push(`Row ${rowNumber}: Phone is required.`);
      return;
    }
    const parsed = memberSchema.safeParse(rawMember);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] ? String(issue.path[0]).replace(/_/g, " ") : "data";
      errors.push(`Row ${rowNumber}: ${field} — ${issue?.message ?? "Invalid data"}`);
      return;
    }
    if (uploadedPhones.has(parsed.data.phone)) {
      errors.push(`Row ${rowNumber}: duplicate phone number in this file.`);
      return;
    }
    uploadedPhones.add(parsed.data.phone);
    candidates.push({ member: parsed.data, rowNumber });
  });

  const supabase = await createClient();
  const { data: branch } = await supabase.from("branches").select("id").eq("id", branchId).eq("status", "active").maybeSingle();
  if (!branch) return { error: "Choose an active branch." };

  const existingPhones = new Set<string>();
  for (let index = 0; index < candidates.length; index += INSERT_CHUNK_SIZE) {
    const phones = candidates.slice(index, index + INSERT_CHUNK_SIZE).map((candidate) => candidate.member.phone);
    const { data, error } = await supabase.from("members").select("phone").eq("branch_id", branchId).in("phone", phones);
    if (error) return { error: error.message };
    data?.forEach((member) => existingPhones.add(member.phone));
  }

  const members = candidates.filter((candidate) => {
    if (!existingPhones.has(candidate.member.phone)) return true;
    errors.push(`Row ${candidate.rowNumber}: phone number already exists in this branch.`);
    return false;
  });

  let imported = 0;
  for (let index = 0; index < members.length; index += INSERT_CHUNK_SIZE) {
    const batch = members.slice(index, index + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from("members").insert(batch.map((candidate) => candidate.member));
    if (error) {
      errors.push(`Rows ${batch[0]?.rowNumber}-${batch.at(-1)?.rowNumber}: ${error.message}`);
      continue;
    }
    imported += batch.length;
  }

  revalidatePath("/admin/members");
  return { imported, skipped: rows.length - imported, errors: errors.slice(0, 10) };
}