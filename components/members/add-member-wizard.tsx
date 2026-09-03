"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, Check, User, Phone, HeartPulse, CreditCard, Wallet, Dumbbell, ClipboardList, Save, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberDynamicFields } from "@/components/members/member-dynamic-fields";
import type { MemberFormFieldConfiguration, MemberFormFieldKey } from "@/lib/members/member-form-config";
import { getLocalDateInputValue } from "@/lib/membership-dates";
import { cn, formatCurrency } from "@/lib/utils";
import { applyMemberFormConfiguration, memberSchema } from "@/lib/validations/member";
import { createMemberAction } from "@/app/actions/member-actions";

interface Plan { id: string; name: string; price: number; gst_percent: number; discount_percent: number; duration_months: number; }
interface Trainer { id: string; name: string; }
interface Branch { id: string; name: string; }
interface AddMemberWizardProps { branches: Branch[]; plans: Plan[]; trainers: Trainer[]; memberFormFields: MemberFormFieldConfiguration[]; basePath?: string; initialBranchId?: string | null; }

const STEPS = [
  { id: 1, label: "Personal", icon: User },
  { id: 2, label: "Emergency", icon: Phone },
  { id: 3, label: "Medical", icon: HeartPulse },
  { id: 4, label: "Membership", icon: CreditCard },
  { id: 5, label: "Payment", icon: Wallet },
  { id: 6, label: "Trainer", icon: Dumbbell },
  { id: 7, label: "Review", icon: ClipboardList },
  { id: 8, label: "Save", icon: Save },
] as const;
const fieldClass = "space-y-1.5 text-sm font-medium";

const fullSchema = memberSchema.extend({
  plan_id: z.string().uuid("Package is required."),
  start_date: z.string().min(1, "Start date is required."),
  payment_amount: z.coerce.number().nonnegative("Payment amount is required."),
  payment_method: z.enum(["cash", "upi", "card", "online"]).default("cash"),
  transaction_ref: z.string().optional().or(z.literal("")),
});

type WizardFormData = z.infer<typeof fullSchema>;

export function AddMemberWizard({ branches, plans, trainers, memberFormFields, basePath = "/admin/members", initialBranchId = null }: AddMemberWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const form = useForm<WizardFormData>({
    resolver: zodResolver(applyMemberFormConfiguration(fullSchema, memberFormFields)),
    defaultValues: { status: "active", branch_id: initialBranchId ?? "", payment_method: "cash", start_date: getLocalDateInputValue() },
    mode: "onTouched",
  });
  const { watch, register, setValue, formState: { errors }, trigger, getValues } = form;
  const data = watch();
  const selectedPlan = plans.find((plan) => plan.id === data.plan_id);
  const planPrice = selectedPlan?.price ?? 0;
  const gstAmt = Math.round((planPrice * (selectedPlan?.gst_percent ?? 18)) / 100);
  const totalAmt = planPrice + gstAmt;
  const paymentCompleted = Number(data.payment_amount ?? 0);
  const pendingAmount = Math.max(0, totalAmt - paymentCompleted);
  const paymentInvalid = paymentCompleted > totalAmt;

  const sections = {
    personal: memberFormFields.filter((field) => field.enabled && field.section === "personal"),
    emergency: memberFormFields.filter((field) => field.enabled && field.section === "emergency"),
    medical: memberFormFields.filter((field) => field.enabled && field.section === "medical"),
  };

  async function goNext() {
    const fieldsByStep: Array<Array<keyof WizardFormData>> = [
      sections.personal.map((field) => field.key as keyof WizardFormData),
      sections.emergency.map((field) => field.key as keyof WizardFormData),
      sections.medical.map((field) => field.key as keyof WizardFormData),
      ["plan_id", "start_date"],
      ["payment_amount", "payment_method"],
      [],
      [],
      [],
    ];
    const keys = [...fieldsByStep[step - 1]];
    if (step === 1 && !initialBranchId) keys.push("branch_id");
    const valid = await trigger(keys);
    if (step === 5 && paymentInvalid) {
      form.setError("payment_amount", { message: "Payment completed cannot be greater than total amount." });
      return;
    }
    if (valid) setStep((current) => Math.min(current + 1, 8));
  }

  function errorMap(keys: MemberFormFieldKey[]) {
    return Object.fromEntries(keys.map((key) => [key, errors[key]?.message ? String(errors[key]?.message) : undefined])) as Partial<Record<MemberFormFieldKey, string | undefined>>;
  }

  function onSubmit() {
    const values = getValues();
    const formData = new FormData();
    const keys = ["full_name", "phone", "email", "gender", "date_of_birth", "age", "address", "candidate_consent_name", "relationship_to_candidate", "screening_date", "screening_valid_until", "branch_id", "status", "height_cm", "weight_kg", "blood_group", "medical_conditions", "fitness_goal", "emergency_contact_name", "emergency_contact_phone", "assigned_trainer_id", "plan_id", "start_date", "payment_amount", "payment_method", "transaction_ref"] as const;
    for (const key of keys) {
      const value = values[key as keyof WizardFormData];
      if (value !== undefined && value !== null && value !== "") formData.set(key, String(value));
    }
    if (initialBranchId && !formData.get("branch_id")) formData.set("branch_id", initialBranchId);
    formData.set("status", "active");
    startTransition(async () => {
      const result = await createMemberAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Member registered successfully!");
      router.push(basePath);
    });
  }

  const row = (label: string, value?: string | null) => <div key={label} className="flex items-start justify-between border-b py-1.5 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="max-w-[60%] text-right text-sm font-medium">{value || "-"}</span></div>;

  return <div className="space-y-6">
    <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Required:</span> Membership details, payment details, and any member fields marked required for this gym.</p>
    <div className="flex items-center gap-0 overflow-x-auto pb-2">{STEPS.map((item, idx) => { const Icon = item.icon; const done = step > item.id; const current = step === item.id; return <div key={item.id} className="flex items-center"><button type="button" disabled={item.id > step} onClick={() => item.id < step && setStep(item.id)} className={cn("flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all", current && "bg-primary/10", done && "cursor-pointer opacity-80 hover:bg-muted", item.id > step && "cursor-not-allowed opacity-40")}><div className={cn("grid size-8 place-items-center rounded-full border-2 transition-all", current && "border-primary bg-primary text-white", done && "border-emerald-500 bg-emerald-500 text-white", item.id > step && "border-border bg-background text-muted-foreground")}>{done ? <Check className="size-4" /> : <Icon className="size-4" />}</div><span className="whitespace-nowrap text-[10px] font-medium">{item.label}</span></button>{idx < STEPS.length - 1 ? <div className={cn("h-0.5 w-6 flex-shrink-0 rounded-full transition-colors", done ? "bg-emerald-500" : "bg-border")} /> : null}</div>; })}</div>
    <div className="min-h-[360px]">
      {step === 1 && <div><h2 className="mb-5 text-base font-semibold">Personal Information</h2><MemberDynamicFields fields={sections.personal} values={data} errors={errorMap(sections.personal.map((field) => field.key))} register={(name) => register(name as keyof WizardFormData)} setValue={(name, value) => setValue(name as keyof WizardFormData, value as never, { shouldValidate: true, shouldTouch: true })} />{initialBranchId ? <input type="hidden" {...register("branch_id")} value={initialBranchId} /> : <label className={fieldClass}>Branch *<select {...register("branch_id")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>{errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id.message}</p>}</label>}</div>}
      {step === 2 && <div><h2 className="mb-5 text-base font-semibold">Emergency Contact</h2><MemberDynamicFields fields={sections.emergency} values={data} errors={errorMap(sections.emergency.map((field) => field.key))} register={(name) => register(name as keyof WizardFormData)} setValue={(name, value) => setValue(name as keyof WizardFormData, value as never, { shouldValidate: true, shouldTouch: true })} /></div>}
      {step === 3 && <div><h2 className="mb-5 text-base font-semibold">Medical Information</h2><MemberDynamicFields fields={sections.medical} values={data} errors={errorMap(sections.medical.map((field) => field.key))} register={(name) => register(name as keyof WizardFormData)} setValue={(name, value) => setValue(name as keyof WizardFormData, value as never, { shouldValidate: true, shouldTouch: true })} /></div>}
      {step === 4 && <div><h2 className="mb-5 text-base font-semibold">Membership Plan</h2><div className="grid gap-4 md:grid-cols-2"><label className={fieldClass}>Select package *<select {...register("plan_id")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select package</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.price)} / {plan.duration_months}mo</option>)}</select>{errors.plan_id && <p className="text-xs text-red-600">{errors.plan_id.message}</p>}</label><label className={fieldClass}>Start date *<Input {...register("start_date")} type="date" />{errors.start_date && <p className="text-xs text-red-600">{errors.start_date.message}</p>}</label></div>{selectedPlan && <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm"><p className="font-semibold">{selectedPlan.name}</p><div className="mt-2 grid grid-cols-2 gap-y-1 text-muted-foreground sm:grid-cols-4"><span>Duration</span><span className="font-medium text-foreground">{selectedPlan.duration_months} months</span><span>Price</span><span className="font-medium text-foreground">{formatCurrency(selectedPlan.price)}</span><span>GST ({selectedPlan.gst_percent}%)</span><span className="font-medium text-foreground">{formatCurrency(Math.round(selectedPlan.price * selectedPlan.gst_percent / 100))}</span><span>Total</span><span className="font-bold text-foreground">{formatCurrency(selectedPlan.price + Math.round(selectedPlan.price * selectedPlan.gst_percent / 100))}</span></div></div>}</div>}
      {step === 5 && <div><h2 className="mb-5 text-base font-semibold">Payment Details</h2>{selectedPlan && <div className="mb-4 rounded-xl border bg-muted/40 p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-semibold">{formatCurrency(totalAmt)}</span></div><div className="mt-2 flex justify-between border-t pt-2"><span className="text-muted-foreground">Pending Amount</span><span className="font-bold text-amber-700">{formatCurrency(pendingAmount)}</span></div><p className="mt-2 text-xs text-muted-foreground">Pending Amount = Total Amount - Payment Completed</p></div>}<div className="grid gap-4 md:grid-cols-2"><label className={fieldClass}>Payment Completed *<Input {...register("payment_amount")} type="number" min="0" max={totalAmt} step="1" placeholder="0" />{errors.payment_amount && <p className="text-xs text-red-600">{errors.payment_amount.message}</p>}{paymentInvalid && <p className="text-xs text-red-600">Payment completed cannot be greater than total amount.</p>}</label><label className={fieldClass}>Payment Status<Input value={paymentCompleted === 0 ? "Pending" : paymentCompleted === totalAmt ? "Paid" : "Partially Paid"} readOnly className="mt-1 bg-muted" /></label><label className={fieldClass}>Payment Method<select {...register("payment_method")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online</option></select></label><label className={fieldClass}>Pending Amount<Input value={formatCurrency(pendingAmount)} readOnly className="mt-1 bg-muted" /></label><label className={cn(fieldClass, "md:col-span-2")}>Transaction reference<Input {...register("transaction_ref")} placeholder="UPI ID, card last 4 digits, etc." /></label></div></div>}
      {step === 6 && <div><h2 className="mb-5 text-base font-semibold">Trainer Assignment</h2><label className={fieldClass}>Assign trainer<select {...register("assigned_trainer_id")} className="mt-1 h-10 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Not assigned</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label><p className="mt-3 text-xs text-muted-foreground">Trainer assignment is optional and can be changed anytime from the member profile.</p></div>}
      {step === 7 && <div><h2 className="mb-4 text-base font-semibold">Review & Confirm</h2><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Member Profile</p>{memberFormFields.filter((field) => field.enabled).map((field) => row(field.label, data[field.key] ? String(data[field.key]) : undefined))}{row("Branch", branches.find((branch) => branch.id === data.branch_id)?.name)}</div><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membership & Payment</p>{row("Package", selectedPlan?.name)}{row("Start date", data.start_date)}{row("Total amount", selectedPlan ? formatCurrency(totalAmt) : undefined)}{row("Payment amount", data.payment_amount !== undefined && data.payment_amount !== null ? formatCurrency(Number(data.payment_amount)) : undefined)}{row("Payment method", data.payment_method)}{row("Trainer", trainers.find((trainer) => trainer.id === data.assigned_trainer_id)?.name)}</div></div></div>}
      {step === 8 && <div className="grid min-h-[240px] place-items-center text-center">{isPending ? <div className="flex flex-col items-center gap-3"><LoaderCircle className="size-10 animate-spin text-primary" /><p className="font-medium">Registering member...</p><p className="text-sm text-muted-foreground">Please wait while we save the profile.</p></div> : <div className="flex flex-col items-center gap-3"><div className="grid size-16 place-items-center rounded-2xl bg-primary/10"><Save className="size-8 text-primary" /></div><p className="text-lg font-semibold">Ready to register</p><p className="max-w-sm text-sm text-muted-foreground">Click <strong>Register Member</strong> to create the profile and save the package and payment details.</p></div>}</div>}
    </div>
    <div className="flex items-center justify-between border-t pt-4"><Button type="button" variant="outline" onClick={step === 1 ? () => history.back() : () => setStep((current) => Math.max(current - 1, 1))} disabled={isPending}><ChevronLeft className="size-4" />{step === 1 ? "Cancel" : "Back"}</Button>{step < 7 && <Button type="button" onClick={goNext}>Next<ChevronRight className="size-4" /></Button>}{step === 7 && <Button type="button" onClick={() => setStep(8)}>Confirm & Save<ChevronRight className="size-4" /></Button>}{step === 8 && <Button type="button" onClick={onSubmit} disabled={isPending}>{isPending ? <><LoaderCircle className="size-4 animate-spin" />Saving...</> : <><Save className="size-4" />Register Member</>}</Button>}</div>
  </div>;
}
