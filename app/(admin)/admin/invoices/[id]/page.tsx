import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getInvoiceById } from "@/services/payment.service";
import type { Invoice, Payment } from "@/services/payment.service";

type InvoiceRecord = Invoice & { payments?: Payment[]; invoice_number?: string | null };

const methodLabel: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  online: "Online",
};

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDisplayDatePlain(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function compact(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
}

function firstPayment(payments: Payment[]) {
  return [...payments].sort((a, b) => {
    const aValue = new Date(a.paid_at ?? a.created_at).getTime();
    const bValue = new Date(b.paid_at ?? b.created_at).getTime();
    return aValue - bValue;
  })[0] ?? null;
}

function formatInvoiceNumber(invoice: InvoiceRecord) {
  return invoice.invoice_number?.trim() || invoice.id.slice(0, 8).toUpperCase();
}

function numberToWords(value: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const underThousand = (num: number) => {
    const parts: string[] = [];
    if (num >= 100) {
      parts.push(`${ones[Math.floor(num / 100)]} Hundred`);
      num %= 100;
    }
    if (num >= 20) {
      parts.push(tens[Math.floor(num / 10)]);
      if (num % 10) parts.push(ones[num % 10]);
    } else if (num >= 10) {
      parts.push(teens[num - 10]);
    } else if (num > 0) {
      parts.push(ones[num]);
    }
    return parts.join(" ").trim();
  };

  if (!Number.isFinite(value) || value <= 0) return "Zero Rupees Only";

  const rounded = Math.round(value);
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;
  const parts: string[] = [];

  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (remainder) parts.push(underThousand(remainder));

  return `${parts.join(" ").trim()} Rupees Only`;
}

export default async function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(["admin", "manager"]);

  const invoice = (await getInvoiceById(id)) as InvoiceRecord | null;
  if (!invoice) notFound();

  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const payment = firstPayment(payments);
  const subscription = Array.isArray(invoice.subscriptions) ? invoice.subscriptions[0] ?? null : invoice.subscriptions ?? null;
  const branchRecord = invoice.branches as (InvoiceRecord["branches"] & { finance_settings?: { gstin?: string | null; legal_business_name?: string | null; business_address?: string | null; business_city?: string | null; business_state?: string | null; business_state_code?: string | null; business_pincode?: string | null } | null }) | null;
  const financeSettings = branchRecord?.finance_settings ?? null;
  const tenant = invoice.branches?.tenants ?? null;

  const businessName = financeSettings?.legal_business_name?.trim() || invoice.branches?.name?.trim() || tenant?.name?.trim() || "Gym";
  const addressLines = [
    compact([financeSettings?.business_address ?? invoice.branches?.address ?? tenant?.address ?? null, financeSettings?.business_city ?? invoice.branches?.city ?? tenant?.city ?? null]).join(", "),
    compact([financeSettings?.business_state ?? invoice.branches?.state ?? tenant?.state ?? null, invoice.branches?.country ?? tenant?.country ?? null]).join(", "),
  ].map((line, index) => {
    const pin = financeSettings?.business_pincode?.trim() || invoice.branches?.postal_code?.trim() || tenant?.postal_code?.trim() || null;
    return index === 1 && line ? `${line}${pin ? ` - ${pin}` : ""}` : line;
  }).filter(Boolean) as string[];
  const contactLine = compact([invoice.branches?.phone ?? tenant?.phone ?? null, invoice.branches?.email ?? tenant?.email ?? null]).join(" | ") || null;
  const gstin = financeSettings?.gstin?.trim() || tenant?.gst_number?.trim() || null;
  const stateName = financeSettings?.business_state?.trim() || invoice.branches?.state?.trim() || tenant?.state?.trim() || null;
  const stateCode = financeSettings?.business_state_code?.trim() || null;
  const memberName = invoice.members?.full_name?.trim() || "Unknown member";
  const memberCode = invoice.members?.member_code?.trim() || null;
  const memberPhone = invoice.members?.phone?.trim() || null;
  const memberEmail = invoice.members?.email?.trim() || null;
  const memberAddress = (invoice.members as { address?: string | null } | null)?.address?.trim() || null;
  const memberAddressLine = compact([memberAddress, memberPhone, memberEmail]).join(", ") || null;
  const planName = subscription?.membership_plans?.name?.trim() || (Array.isArray(invoice.line_items) ? String((invoice.line_items[0] as Record<string, unknown> | undefined)?.description ?? "") : "") || null;
  const invoiceNumber = formatInvoiceNumber(invoice);
  const invoiceDate = formatDisplayDate(invoice.created_at);
  const invoiceDatePlain = formatDisplayDatePlain(invoice.created_at);
  const paymentDate = formatDisplayDate(payment?.paid_at ?? payment?.created_at ?? null);
  const membershipStart = formatDisplayDate(subscription?.start_date ?? null);
  const membershipEnd = formatDisplayDate(subscription?.end_date ?? invoice.due_date ?? null);
  const outstanding = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0));
  const invoiceStatus = invoice.status || "unpaid";
  const taxableAmount = Number(invoice.taxable_amount ?? invoice.subtotal ?? 0);
  const gstAmount = Number(invoice.gst_amount ?? 0);
  const cgstAmount = Number(invoice.cgst_amount ?? 0);
  const sgstAmount = Number(invoice.sgst_amount ?? 0);
  const igstAmount = Number(invoice.igst_amount ?? 0);
  const gstRate = Number(invoice.gst_rate ?? 0);
  const invoiceTitle = gstAmount > 0 || Boolean(gstin) ? "TAX INVOICE" : "INVOICE";
  const description = planName || "Membership package";
  const amountInWords = numberToWords(Number(invoice.total_amount ?? 0));

  return (
    <>

      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }

        @media print {
          html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    <div className="mx-auto max-w-5xl space-y-5 print:m-0 print:max-w-none print:w-full">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/admin/payments" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft className="size-4" />
          Payments
        </Link>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      <Card className="border-none bg-transparent shadow-none print:rounded-none print:border-0 print:shadow-none">
        <CardContent className="bg-white p-0 text-black print:p-0">
          <section className="overflow-hidden rounded-2xl border-2 border-black bg-white print:rounded-none print:border print:border-black">
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 print:px-4 print:pb-2 print:pt-3">
              <div className="max-w-[70%]">
                <h1 className="text-[28px] font-extrabold uppercase tracking-wide text-violet-800 print:text-[24px]">{businessName}</h1>
                {gstin ? <p className="text-[16px] font-bold text-violet-700 print:text-[14px]">GST No. {gstin}</p> : null}
                <div className="mt-1 space-y-0.5 text-sm font-semibold leading-5 print:text-[12px] print:leading-4">
                  {addressLines.map((line) => <p key={line}>{line}</p>)}
                  {contactLine ? <p>{contactLine}</p> : null}
                  {stateName || stateCode ? <p>State Name : {stateName ?? "-"}, State Code : {stateCode ?? "-"}</p> : null}
                </div>
              </div>
              <div className="rounded-md bg-violet-700 px-5 py-3 text-center text-[16px] font-medium text-white shadow-sm print:px-4 print:py-2 print:text-[14px]">
                {invoiceTitle === "TAX INVOICE" ? "Tax Invoice" : "Invoice"}
              </div>
            </div>

            <div className="border-y-2 border-black bg-violet-200/70 px-4 py-1.5 print:py-1" />

            <div className="border-b-2 border-black">
              <div className="grid grid-cols-[1.3fr_0.7fr]">
                <div className="border-r-2 border-black px-3 py-2 text-[13px] print:text-[12px]">
                  <p><span className="font-bold">Client Name :</span> <span className="ml-3 font-extrabold uppercase">{memberName}</span></p>
                  {memberAddressLine ? <p className="mt-1"><span className="font-bold">Address</span> <span className="ml-[39px]">: {memberAddressLine}</span></p> : null}
                  {memberCode ? <p className="mt-1"><span className="font-bold">Member ID</span> <span className="ml-[23px]">: {memberCode}</span></p> : null}
                </div>
                <div className="px-3 py-2 text-[13px] print:text-[12px]">
                  <p className="flex justify-between gap-4"><span className="font-bold">Date</span><span>: {invoiceDatePlain ?? "-"}</span></p>
                  <p className="mt-1 flex justify-between gap-4"><span className="font-bold">Invoice No</span><span>: {invoiceNumber}</span></p>
                  <p className="mt-1 flex justify-between gap-4"><span className="font-bold">Status</span><span>: {invoiceStatus}</span></p>
                </div>
              </div>
            </div>

            <div className="border-b-2 border-black">
              <div className="grid grid-cols-[1.3fr_0.7fr]">
                <div className="border-r-2 border-black px-3 py-2 text-[13px] print:text-[12px]">
                  <p className="text-[16px] underline">Delivery Address:</p>
                  <p className="mt-1"><span className="font-bold">Client Name :</span> <span className="ml-3 font-semibold uppercase">{memberName}</span></p>
                  {memberAddressLine ? <p className="mt-1"><span className="font-bold">Address</span> <span className="ml-[39px]">: {memberAddressLine}</span></p> : null}
                  {memberCode ? <p className="mt-1"><span className="font-bold">Member ID</span> <span className="ml-[23px]">: {memberCode}</span></p> : null}
                </div>
                <div className="px-3 py-2 text-[13px] print:text-[12px]">
                  {stateName ? <p>State Name: {stateName}</p> : null}
                  {stateCode ? <p className="mt-8">State Code: {stateCode}</p> : null}
                  {payment ? <p className="mt-8">Payment: {methodLabel[payment.method] ?? payment.method}</p> : null}
                  {paymentDate ? <p className="mt-1">Paid On: {paymentDate}</p> : null}
                </div>
              </div>
            </div>

            <table className="w-full border-collapse text-[13px] print:text-[12px]">
              <thead>
                <tr className="bg-violet-200/80">
                  <th className="w-[10%] border-b-2 border-r-2 border-black px-2 py-2 font-extrabold">S.No</th>
                  <th className="w-[38%] border-b-2 border-r-2 border-black px-2 py-2 font-extrabold">Description</th>
                  <th className="w-[14%] border-b-2 border-r-2 border-black px-2 py-2 font-extrabold">HSN Code</th>
                  <th className="w-[13%] border-b-2 border-r-2 border-black px-2 py-2 font-extrabold">Qty</th>
                  <th className="w-[11%] border-b-2 border-r-2 border-black px-2 py-2 font-extrabold">Rate</th>
                  <th className="w-[14%] border-b-2 border-black px-2 py-2 font-extrabold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="h-[130px] border-r-2 border-black px-2 py-2 text-center">1</td>
                  <td className="border-r-2 border-black px-3 py-2">
                    <p className="font-bold">{description}</p>
                    {membershipStart || membershipEnd ? (
                      <p className="mt-2 text-sm">
                        {membershipStart ? `Membership Start: ${membershipStart}` : ""}
                        {membershipStart && membershipEnd ? " | " : ""}
                        {membershipEnd ? `Membership End: ${membershipEnd}` : ""}
                      </p>
                    ) : null}
                    {invoice.notes?.trim() ? <p className="mt-2 text-sm">{invoice.notes.trim()}</p> : null}
                  </td>
                  <td className="border-r-2 border-black px-2 py-2 text-center">-</td>
                  <td className="border-r-2 border-black px-2 py-2 text-center">1</td>
                  <td className="border-r-2 border-black px-2 py-2 text-right">{formatCurrency(taxableAmount)}</td>
                  <td className="px-2 py-2 text-right font-semibold">{formatCurrency(taxableAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="border-y-2 border-black bg-violet-200/80 px-4 py-1 text-right text-[16px] font-extrabold print:text-[14px]">
              Total Value
            </div>

            <div className="grid grid-cols-[1fr_0.35fr_0.15fr] border-b-2 border-black text-[13px] print:text-[12px]">
              <div className="border-r-2 border-black px-4 py-1.5" />
              <div className="border-r-2 border-black px-4 py-2">
                {invoice.discount_amount > 0 ? <p className="flex justify-between gap-4"><span>Less : Discount</span><span>{formatCurrency(invoice.discount_amount)}</span></p> : null}
                {cgstAmount > 0 ? <p className="flex justify-between gap-4"><span>Add : CGST</span><span>{gstRate > 0 ? `${(gstRate / 2).toFixed(2)}%` : formatCurrency(cgstAmount)}</span></p> : null}
                {sgstAmount > 0 ? <p className="mt-1 flex justify-between gap-4"><span>Add : SGST</span><span>{gstRate > 0 ? `${(gstRate / 2).toFixed(2)}%` : formatCurrency(sgstAmount)}</span></p> : null}
                {igstAmount > 0 ? <p className="mt-1 flex justify-between gap-4"><span>Add : IGST</span><span>{gstRate > 0 ? `${gstRate.toFixed(2)}%` : formatCurrency(igstAmount)}</span></p> : null}
                {gstAmount <= 0 && invoice.discount_amount <= 0 ? <p>&nbsp;</p> : null}
              </div>
              <div className="px-4 py-1.5 text-right">
                {invoice.discount_amount > 0 ? <p>{formatCurrency(invoice.discount_amount)}</p> : null}
                {cgstAmount > 0 ? <p>{formatCurrency(cgstAmount)}</p> : null}
                {sgstAmount > 0 ? <p className="mt-1">{formatCurrency(sgstAmount)}</p> : null}
                {igstAmount > 0 ? <p className="mt-1">{formatCurrency(igstAmount)}</p> : null}
                {gstAmount <= 0 && invoice.discount_amount <= 0 ? <p>&nbsp;</p> : null}
              </div>
            </div>

            <div className="border-b-2 border-black bg-violet-200/80 px-4 py-1 text-right text-[18px] font-extrabold">
              Grand Total
            </div>

            <div className="grid grid-cols-[1fr_0.4fr] px-4 py-4 text-[13px] print:text-[12px]">
              <div>
                <p className="font-bold">Amount in Words: <span className="border-b-2 border-black pb-1 font-semibold">{amountInWords}</span></p>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-extrabold print:text-[14px]">{formatCurrency(Number(invoice.total_amount ?? 0))}</p>
                <div className="mt-8 print:mt-6">
                  <p className="text-[16px] font-bold uppercase">For {businessName}</p>
                  <p className="mt-12 text-[14px] font-bold print:mt-10 print:text-[12px]">Authorised Signature</p>
                </div>
              </div>
            </div>

          </section>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
