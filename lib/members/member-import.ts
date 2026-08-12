import * as XLSX from "xlsx";

export const MEMBER_FIELDS = [
  "ignore",
  "fullName",
  "phone",
  "email",
  "gender",
  "dateOfBirth",
  "address",
  "age",
  "payment",
  "package",
  "membershipStartDate",
  "membershipEndDate",
  "height",
  "weight",
  "bloodGroup",
  "medicalConditions",
  "fitnessGoal",
  "status",
  "emergencyContact",
  "emergencyPhone",
  "candidateConsentName",
  "relationshipToCandidate",
  "screeningDate",
  "screeningValidUntil",
  "notes",
] as const;

export type MemberField = (typeof MEMBER_FIELDS)[number];
export type MemberMapping = Record<number, MemberField>;
export type MemberRequiredField = never;

export type SpreadsheetData = {
  worksheet: string;
  worksheets: string[];
  columns: string[];
  rows: unknown[][];
  rowOffset: number;
};

export type MemberImportError = {
  row: number;
  name: string;
  payment: string;
  package: string;
  startDate: string;
  endDate: string;
  error: string;
};

export type MemberCandidate = {
  row: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  payment: number | null;
  package: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  height: number | null;
  weight: number | null;
  bloodGroup: string | null;
  medicalConditions: string | null;
  fitnessGoal: string | null;
  status: "active" | "inactive";
  emergencyContact: string | null;
  emergencyPhone: string | null;
  age: number | null;
  candidateConsentName: string | null;
  relationshipToCandidate: string | null;
  screeningDate: string | null;
  screeningValidUntil: string | null;
  notes: string | null;
};

const aliases: Record<Exclude<MemberField, "ignore" | "notes">, string[]> = {
  fullName: ["name", "full name", "full_name", "member name", "member_name", "customer name", "customer_name", "name of candidates"],
  phone: ["phone", "mobile", "mobile number", "phone number", "contact", "contact number", "contact number"],
  email: ["email", "email address", "mail", "mail id", "e mail of candidates"],
  gender: ["gender", "sex"],
  dateOfBirth: ["dob", "date of birth", "date_of_birth", "birth date", "birth_date"],
  address: ["address", "home address", "home_address"],
  age: ["age"],
  payment: ["payment", "amount", "paid amount", "paid_amount", "payment amount", "total payment", "fees", "fee", "membership fee", "membership_fee"],
  package: ["package", "plan", "membership plan", "membership_plan", "membership package", "membership_package"],
  membershipStartDate: ["start date", "start", "start_date", "membership start date", "membership_start_date", "joining date", "joining_date", "join date", "join_date", "created date", "created_date"],
  membershipEndDate: ["end date", "end", "end_date", "membership end date", "membership_end_date", "expiry date", "expiry_date", "expiration date", "valid_until"],
  height: ["height", "height cm", "height_cm"],
  weight: ["weight", "weight kg", "weight_kg"],
  bloodGroup: ["blood group", "blood_group", "blood"],
  medicalConditions: ["medical conditions", "medical condition", "medical"],
  fitnessGoal: ["fitness goal", "fitness_goal", "goal"],
  status: ["status", "member status", "member_status"],
  emergencyContact: ["emergency contact", "emergency contact name", "emergency name"],
  emergencyPhone: ["emergency phone", "emergency contact phone", "nominee contact number"],
  candidateConsentName: ["candidate consent name", "consent name"],
  relationshipToCandidate: ["relationship to the candidates", "relationship to candidate", "relationship"],
  screeningDate: ["date of screening", "screening date"],
  screeningValidUntil: ["valid until", "screening valid until"],
};

export const memberFieldLabels: Record<MemberField, string> = {
  ignore: "Ignore this column",
  fullName: "Full Name",
  phone: "Phone",
  email: "Email",
  gender: "Gender",
  dateOfBirth: "Date of Birth",
  address: "Address",
  age: "Age",
  payment: "Payment",
  package: "Package",
  membershipStartDate: "Membership Start Date",
  membershipEndDate: "Membership End Date",
  height: "Height",
  weight: "Weight",
  bloodGroup: "Blood Group",
  medicalConditions: "Medical Conditions",
  fitnessGoal: "Fitness Goal",
  status: "Status",
  emergencyContact: "Emergency Contact",
  emergencyPhone: "Emergency Phone",
  candidateConsentName: "Candidate Consent Name",
  relationshipToCandidate: "Relationship To The Candidate",
  screeningDate: "Date Of Screening",
  screeningValidUntil: "Valid Until",
  notes: "Notes",
};

const required: MemberRequiredField[] = [];

const norm = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const text = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

export function parseMemberSpreadsheet(
  buffer: ArrayBuffer,
  fileName: string,
  worksheet?: string,
  separator = ",",
  skipFirst = 0,
): SpreadsheetData {
  const workbook = XLSX.read(buffer, {
    type: "array",
    FS: fileName.toLowerCase().endsWith(".csv") ? separator : undefined,
    raw: true,
    cellDates: false,
  });

  const selected = worksheet ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[selected];
  if (!sheet) {
    throw new Error("No worksheet found");
  }

  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const headerIndex = skipFirst;
  const columns = (table[headerIndex] ?? []).map(
    (value, index) => text(value) || `Unnamed column ${index + 1}`,
  );

  return {
    worksheet: selected,
    worksheets: workbook.SheetNames,
    columns,
    rows: table.slice(headerIndex + 1).filter((row) => row.some((value) => text(value))),
    rowOffset: headerIndex + 2,
  };
}

export function autoDetectMemberMapping(columns: string[]): MemberMapping {
  const mapping: MemberMapping = {};

  columns.forEach((column, index) => {
    const key = norm(column);
    mapping[index] = (Object.entries(aliases).find(([, names]) =>
      names.some((name) => norm(name) === key),
    )?.[0] ?? "ignore") as MemberField;
  });

  return mapping;
}

export function missingMemberFields(mapping: MemberMapping) {
  return required.filter((field) => !Object.values(mapping).includes(field));
}

function find(row: unknown[], mapping: MemberMapping, field: MemberField) {
  const index = Object.entries(mapping).find(([, value]) => value === field)?.[0];
  return index === undefined ? "" : row[Number(index)];
}

export function parseExcelDate(value: unknown): string | null {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const valueText = text(value);
  if (!valueText) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueText)) {
    return valueText;
  }

  const match = valueText.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const [, first, second, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  const a = Number(first);
  const b = Number(second);
  const month = a > 12 ? b : a;
  const day = a > 12 ? a : b;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

export function parsePayment(value: unknown): number | null {
  const cleaned = text(value).replace(/[\u20B9,$\s]/g, "").replace(/,/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function optional(value: unknown) {
  const output = text(value);
  return output || null;
}

function cleanPhone(value: unknown) {
  const output = text(value).replace(/(?!^)\+|[^\d+]/g, "");
  return output || null;
}

export function validateMemberRows(
  rows: unknown[][],
  rowOffset: number,
  mapping: MemberMapping,
  headers: string[] = [],
) {
  const candidates: MemberCandidate[] = [];
  const errors: MemberImportError[] = [];
  const filePhones = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const rowNumber = rowOffset + index;
    const fullName = text(find(row, mapping, "fullName"));
    const paymentRaw = find(row, mapping, "payment");
    const packageName = optional(find(row, mapping, "package"));
    const startRaw = find(row, mapping, "membershipStartDate");
    const endRaw = find(row, mapping, "membershipEndDate");
    const error = (message: string) =>
      errors.push({
        row: rowNumber,
        name: fullName,
        payment: text(paymentRaw),
        package: packageName ?? "",
        startDate: text(startRaw),
        endDate: text(endRaw),
        error: message,
      });

    if (process.env.NODE_ENV === "development" && rowNumber === rowOffset) {
      console.debug("[member-import trace]", {
        rowNumber,
        rawRow: row,
        headers,
        mappings: mapping,
        mappedRow: {
          fullName,
          payment: paymentRaw,
          package: packageName,
          membershipStartDate: startRaw,
          membershipEndDate: endRaw,
        },
        paymentRawValue: paymentRaw,
        paymentParsedValue: parsePayment(paymentRaw),
        startDateRawValue: startRaw,
        endDateRawValue: endRaw,
      });
    }

    if (!fullName) {
      error("Full Name is missing.");
      continue;
    }

    const phone = cleanPhone(find(row, mapping, "phone"));
    if (phone && filePhones.has(phone)) {
      error("Duplicate member phone in this file.");
      continue;
    }
    if (phone) {
      filePhones.add(phone);
    }

    const payment = parsePayment(paymentRaw);
    const start = parseExcelDate(startRaw);
    const end = parseExcelDate(endRaw);
    const membershipValuesProvided = [paymentRaw, packageName, startRaw, endRaw].some(
      (value) => text(value) !== "",
    );

    if (membershipValuesProvided) {
      if (!packageName) {
        error("Package is missing.");
        continue;
      }
      if (!start) {
        error("Membership Start Date is invalid or missing.");
        continue;
      }
      if (!end) {
        error("Membership End Date is invalid or missing.");
        continue;
      }
      if (paymentRaw !== "" && payment === null) {
        error("Payment must be a valid number.");
        continue;
      }
    }

    const g = text(find(row, mapping, "gender")).toLowerCase();
    const gender =
      g === "m"
        ? "male"
        : g === "f"
          ? "female"
          : ["male", "female", "other", "prefer_not_to_say"].includes(g)
            ? g
            : null;
    const dob = parseExcelDate(find(row, mapping, "dateOfBirth"));

    candidates.push({
      row: rowNumber,
      fullName,
      phone,
      email: optional(find(row, mapping, "email")),
      gender,
      dateOfBirth: dob,
      address: optional(find(row, mapping, "address")),
      payment,
      package: packageName,
      membershipStartDate: start,
      membershipEndDate: end,
      height: parsePayment(find(row, mapping, "height")),
      weight: parsePayment(find(row, mapping, "weight")),
      bloodGroup: optional(find(row, mapping, "bloodGroup")),
      medicalConditions: optional(find(row, mapping, "medicalConditions")),
      fitnessGoal: optional(find(row, mapping, "fitnessGoal")),
      status: text(find(row, mapping, "status")).toLowerCase() === "inactive" ? "inactive" : "active",
      emergencyContact: optional(find(row, mapping, "emergencyContact")),
      emergencyPhone: cleanPhone(find(row, mapping, "emergencyPhone")),
      age: parsePayment(find(row, mapping, "age")),
      candidateConsentName: optional(find(row, mapping, "candidateConsentName")),
      relationshipToCandidate: optional(find(row, mapping, "relationshipToCandidate")),
      screeningDate: parseExcelDate(find(row, mapping, "screeningDate")),
      screeningValidUntil: parseExcelDate(find(row, mapping, "screeningValidUntil")),
      notes: optional(find(row, mapping, "notes")),
    });
  }

  return { candidates, errors };
}

export function memberErrorReport(errors: MemberImportError[]) {
  const headers = ["Row", "Name", "Payment", "Package", "Start Date", "End Date", "Error"];
  const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;

  return [
    headers.join(","),
    ...errors.map((item) =>
      [item.row, item.name, item.payment, item.package, item.startDate, item.endDate, item.error]
        .map(quote)
        .join(","),
    ),
  ].join("\n");
}
