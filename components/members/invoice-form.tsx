"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  full_name: string;
  member_code: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
}

const fieldClass = "space-y-1.5 text-sm font-medium";

export function InvoiceForm({ members, plans }: { members: Member[]; plans: Plan[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [memberId, setMemberId] = useState("");
  const [planId, setPlanId] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "online">("cash");
  const [txRef, setTxRef] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Auto-fill pricing when a plan is selected
  useEffect(() => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setCustomPrice(String(plan.price));
      setDiscount(String(Math.round((plan.price * plan.discount_percent) / 100)));
      setGstPercent(String(plan.gst_percent));
    }
  }, [planId, plans]);

  const price = Number(customPrice) || 0;
  const discountAmt = Number(discount) || 0;
  const subtotal = Math.max(0, price - discountAmt);
  const gstAmt = Math.round((subtotal * (Number(gstPercent) || 0)) / 100);
  const total = subtotal + gstAmt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!memberId) { setError("Please select a member."); return; }
    if (total <= 0) { setError("Total amount must be greater than zero."); return; }

    startTransition(async () => {
      try {
        // 1. Create invoice
        const invoiceRes = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            subscription_id: null,
            subtotal,
            discount_amount: discountAmt,
            gst_amount: gstAmt,
            total_amount: total,
            amount_paid: total, // mark as fully paid immediately
            status: "paid",
            due_date: null,
            notes: notes || null,
            line_items: planId
              ? [
                  {
                    description: plans.find((p) => p.id === planId)?.name ?? "Membership",
                    amount: price,
                  },
                ]
              : [],
          }),
        });

        if (!invoiceRes.ok) {
          const body = await invoiceRes.json() as { error?: string };
          throw new Error(body.error ?? "Failed to create invoice.");
        }

        const invoice = await invoiceRes.json() as { id: string };

        // 2. Create payment linked to invoice
        const paymentRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            invoice_id: invoice.id,
            amount: total,
            method,
            status: "completed",
            transaction_reference: txRef || null,
            paid_at: new Date().toISOString(),
          }),
        });

        if (!paymentRes.ok) {
          const body = await paymentRes.json() as { error?: string };
          throw new Error(body.error ?? "Invoice created but payment failed.");
        }

        toast.success("Invoice and payment recorded.");
        router.push(`/invoices/${invoice.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Member + Plan */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass}>
          Member *
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.member_code})
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          Membership plan
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">No plan (manual amount)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} &mdash; &#8377;{p.price.toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Pricing */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Pricing</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className={fieldClass}>
            Amount (&#8377;) *
            <Input
              type="number"
              min="0"
              step="1"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="0"
              required
            />
          </label>
          <label className={fieldClass}>
            Discount (&#8377;)
            <Input
              type="number"
              min="0"
              step="1"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className={fieldClass}>
            GST (%)
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
              placeholder="18"
            />
          </label>
        </div>

        {/* Live total */}
        <div className="mt-4 rounded-lg bg-muted/60 p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (after discount)</span>
            <span className="tabular-nums">&#8377;{subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST ({gstPercent}%)</span>
            <span className="tabular-nums">+ &#8377;{gstAmt.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold text-base">
            <span>Total</span>
            <span className="tabular-nums">&#8377;{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Payment details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={fieldClass}>
            Payment method *
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label className={fieldClass}>
            Transaction reference
            <Input
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="UPI ID, card last 4, etc."
            />
          </label>
        </div>
      </div>

      {/* Notes */}
      <label className={fieldClass}>
        Notes (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Any additional notes for this invoice"
        />
      </label>

      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <LoaderCircle className="size-4 animate-spin" />}
          Create invoice &amp; record payment
        </Button>
      </div>
    </form>
  );
}
