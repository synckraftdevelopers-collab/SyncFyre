import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getGstSummary } from "@/services/finance.service";
import { getGstCaExportRows, resolveGstDateRange } from "@/services/finance-gst.service";

function toCsv(rows: Array<Record<string, string | number | null>>) {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? null)).join(","))].join("\n");
}

function toExportRecords(rows: Awaited<ReturnType<typeof getGstCaExportRows>>) {
  return rows.map((row) => ({
    Date: row.date,
    "Invoice Number": row.invoiceNumber,
    "Member ID": row.memberId,
    "Member Name": row.memberName,
    Package: row.packageName,
    Branch: row.branch,
    Payment: row.paymentAmount,
    Description: row.description,
    "Taxable Amount": row.taxableAmount,
    "GST Rate": row.gstRate,
    CGST: row.cgst,
    SGST: row.sgst,
    IGST: row.igst,
    "Total GST": row.totalGst,
    "Grand Total": row.grandTotal,
    "Payment Method": row.paymentMethod,
    "Payment Status": row.paymentStatus,
  }));
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: string[]): ArrayBuffer {
  const pageHeight = 792;
  const pageWidth = 612;
  const top = 760;
  const lineHeight = 16;
  const linesPerPage = 42;
  const pages: string[] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    const content = ["BT", "/F1 10 Tf", `1 0 0 1 40 ${top} Tm`];
    pageLines.forEach((line, lineIndex) => {
      if (lineIndex === 0) content.push(`(${escapePdfText(line)}) Tj`);
      else content.push(`0 -${lineHeight} Td (${escapePdfText(line)}) Tj`);
    });
    content.push("ET");
    pages.push(content.join("\n"));
  }

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}] >> endobj`);

  pages.forEach((content, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`${pageObjectId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >> endobj`);
    objects.push(`${contentObjectId} 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`);
  });

  const fontObjectId = 3 + pages.length * 2;
  objects.push(`${fontObjectId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const buffer = Buffer.from(pdf, "utf8");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;
  const view = p.get("view") ?? "list";
  const search = p.get("search") ?? undefined;

  try {
    const range = resolveGstDateRange({
      branchId: p.get("branch_id"),
      dateFrom: p.get("date_from") ?? undefined,
      dateTo: p.get("date_to") ?? undefined,
      financialYear: p.get("financial_year") ?? undefined,
      search,
    });

    if (view === "summary") {
      const result = await getGstSummary(p.get("branch_id"), range.dateFrom, range.dateTo);
      return NextResponse.json(result);
    }

    const rows = await getGstCaExportRows({ branchId: p.get("branch_id"), dateFrom: range.dateFrom, dateTo: range.dateTo, financialYear: range.financialYear, search });

    if (view === "export") {
      const format = (p.get("format") ?? "csv").toLowerCase();
      const records = toExportRecords(rows);

      if (format === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(records);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "GST Export");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        return new Response(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="finance-gst-ca-export.xlsx"',
          },
        });
      }

      if (format === "pdf") {
        const lines = [
          "SyncFyre GST CA Export",
          `Period: ${range.dateFrom} to ${range.dateTo}`,
          search ? `Search: ${search}` : "",
          "Date | Invoice | Member ID | Member Name | Package | Branch | Payment | Taxable | GST Rate | CGST | SGST | IGST | Total GST | Grand Total | Payment Method | Payment Status",
          ...rows.map((row) => [
            row.date,
            row.invoiceNumber ?? "-",
            row.memberId ?? "-",
            row.memberName ?? "-",
            row.packageName ?? row.description ?? "-",
            row.branch ?? "-",
            row.paymentAmount.toFixed(2),
            row.taxableAmount.toFixed(2),
            row.gstRate.toFixed(2),
            row.cgst.toFixed(2),
            row.sgst.toFixed(2),
            row.igst.toFixed(2),
            row.totalGst.toFixed(2),
            row.grandTotal.toFixed(2),
            row.paymentMethod ?? "-",
            row.paymentStatus ?? "-",
          ].join(" | ")),
        ];
        return new Response(new Blob([buildSimplePdf(lines)], { type: "application/pdf" }), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="finance-gst-ca-export.pdf"',
          },
        });
      }

      const csv = toCsv(records);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="finance-gst-ca-export.csv"',
        },
      });
    }

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to fetch GST data." }, { status: 500 });
  }
}
