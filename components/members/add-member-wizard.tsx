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
import { cn, formatCurrency } from "@/lib/utils";
import { memberSchema } from "@/lib/validations/member";
import { createMemberAction } from "@/app/actions/member-actions";

interface Plan { id: string; name: string; price: number; gst_percent: number; discount_percent: number; duration_months: number; }
interface Trainer { id: string; name: string; }
interface Branch { id: string; name: string; }
interface AddMemberWizardProps { branches: Branch[]; plans: Plan[]; trainers: Trainer[]; basePath?: string; initialBranchId?: string | null; }

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
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const fieldClass = "space-y-1.5 text-sm font-medium";

const fullSchema = memberSchema.extend({
  plan_id: z.string().uuid("Package is required."),
  start_date: z.string().min(1, "Start date is required."),
  payment_amount: z.coerce.number().nonnegative("Payment amount is required."),
  payment_method: z.enum(["cash", "upi", "card", "online"]).default("cash"),
  transaction_ref: z.string().optional().or(z.literal("")).nullable(),
});

type WizardFormData = z.infer<typeof fullSchema>;
const onlyTenDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

function IndianPhoneField({ value, onValueChange, placeholder = "9876543210" }: { value?: string | null; onValueChange: (value: string) => void; placeholder?: string; }) {
  return <div className="flex items-center rounded-lg border bg-background"><span className="border-r px-3 text-sm text-muted-foreground">+91</span><Input value={(value ?? "").replace(/^\+91/, "")} type="tel" inputMode="numeric" maxLength={10} placeholder={placeholder} className="border-0 focus-visible:ring-0" onChange={(event) => onValueChange(onlyTenDigits(event.target.value))} /></div>;
}

export function AddMemberWizard({ branches, plans, trainers, basePath = "/admin/members", initialBranchId = null }: AddMemberWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const form = useForm<WizardFormData>({ resolver: zodResolver(fullSchema), defaultValues: { status: "active", branch_id: initialBranchId ?? "", payment_method: "cash", start_date: new Date().toISOString().slice(0, 10) }, mode: "onTouched" });
  const { watch, register, setValue, formState: { errors }, trigger, getValues } = form;
  const data = watch();
  const selectedPlan = plans.find((plan) => plan.id === data.plan_id);
  const planPrice = selectedPlan?.price ?? 0;
  const gstAmt = Math.round((planPrice * (selectedPlan?.gst_percent ?? 18)) / 100);
  const totalAmt = planPrice + gstAmt;

  async function goNext() {
    const steps: (keyof WizardFormData)[][] = [
      initialBranchId ? ["full_name", "phone", "email", "gender", "date_of_birth"] : ["full_name", "phone", "branch_id", "email", "gender", "date_of_birth"],
      ["emergency_contact_name", "emergency_contact_phone"],
      ["height_cm", "weight_kg", "blood_group", "medical_conditions", "fitness_goal"],
      ["plan_id", "start_date"],
      ["payment_amount", "payment_method"],
      [], [], [],
    ];
    const valid = await trigger(steps[step - 1] as (keyof WizardFormData)[]);
    if (valid) setStep((current) => Math.min(current + 1, 8));
  }

  function onSubmit() {
    const values = getValues();
    const formData = new FormData();
    const keys = ["full_name", "phone", "email", "gender", "date_of_birth", "address", "branch_id", "status", "height_cm", "weight_kg", "blood_group", "medical_conditions", "fitness_goal", "emergency_contact_name", "emergency_contact_phone", "assigned_trainer_id", "plan_id", "start_date", "payment_amount", "payment_method", "transaction_ref"] as const;
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
    <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Required:</span> Name, package, start date, and payment amount.</p>
    <div className="flex items-center gap-0 overflow-x-auto pb-2">{STEPS.map((item, idx) => { const Icon = item.icon; const done = step > item.id; const current = step === item.id; return <div key={item.id} className="flex items-center"><button type="button" disabled={item.id > step} onClick={() => item.id < step && setStep(item.id)} className={cn("flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all", current && "bg-primary/10", done && "cursor-pointer opacity-80 hover:bg-muted", item.id > step && "cursor-not-allowed opacity-40")}><div className={cn("grid size-8 place-items-center rounded-full border-2 transition-all", current && "border-primary bg-primary text-white", done && "border-emerald-500 bg-emerald-500 text-white", item.id > step && "border-border bg-background text-muted-foreground")}>{done ? <Check className="size-4" /> : <Icon className="size-4" />}</div><span className="whitespace-nowrap text-[10px] font-medium">{item.label}</span></button>{idx < STEPS.length - 1 ? <div className={cn("h-0.5 w-6 flex-shrink-0 rounded-full transition-colors", done ? "bg-emerald-500" : "bg-border")} /> : null}</div>; })}</div>
    <div className="min-h-[360px]">
      {step === 1 && <div><h2 className="mb-5 text-base font-semibold">Personal Information</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className={fieldClass}>Full name *<Input {...register("full_name")} placeholder="e.g. Rahul Sharma" />{errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}</label><label className={fieldClass}>Mobile number<IndianPhoneField value={data.phone} onValueChange={(value) => setValue("phone", value, { shouldValidate: true, shouldTouch: true })} />{errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}</label><label className={fieldClass}>Email<Input {...register("email")} type="email" placeholder="rahul@email.com" /></label><label className={fieldClass}>Gender<select {...register("gender")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label><label className={fieldClass}>Date of birth<Input {...register("date_of_birth")} type="date" /></label>{initialBranchId ? <input type="hidden" {...register("branch_id")} value={initialBranchId} /> : <label className={fieldClass}>Branch<select {...register("branch_id")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>{errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id.message}</p>}</label>}<label className={cn(fieldClass, "md:col-span-2 xl:col-span-3")}>Address<Input {...register("address")} placeholder="Full address" /></label></div></div>}
      {step === 2 && <div><h2 className="mb-5 text-base font-semibold">Emergency Contact</h2><div className="grid gap-4 md:grid-cols-2"><label className={fieldClass}>Contact name<Input {...register("emergency_contact_name")} placeholder="Parent / Spouse name" /></label><label className={fieldClass}>Contact phone<IndianPhoneField value={data.emergency_contact_phone} onValueChange={(value) => setValue("emergency_contact_phone", value, { shouldValidate: true, shouldTouch: true })} /></label></div></div>}
      {step === 3 && <div><h2 className="mb-5 text-base font-semibold">Medical Information</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className={fieldClass}>Height (cm)<Input {...register("height_cm")} type="number" min="1" step="0.1" placeholder="170" /></label><label className={fieldClass}>Weight (kg)<Input {...register("weight_kg")} type="number" min="1" step="0.1" placeholder="70" /></label><label className={fieldClass}>Blood group<select {...register("blood_group")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select blood group</option>{BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label><label className={fieldClass}>Fitness goal<Input {...register("fitness_goal")} placeholder="Weight loss, muscle gain..." /></label><label className={cn(fieldClass, "md:col-span-2 xl:col-span-2")}>Medical conditions<Input {...register("medical_conditions")} placeholder="Allergies, injuries, conditions" /></label></div></div>}
      {step === 4 && <div><h2 className="mb-5 text-base font-semibold">Membership Plan</h2><div className="grid gap-4 md:grid-cols-2"><label className={fieldClass}>Select package *<select {...register("plan_id")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Select package</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.price)} / {plan.duration_months}mo</option>)}</select>{errors.plan_id && <p className="text-xs text-red-600">{errors.plan_id.message}</p>}</label><label className={fieldClass}>Start date *<Input {...register("start_date")} type="date" />{errors.start_date && <p className="text-xs text-red-600">{errors.start_date.message}</p>}</label></div>{selectedPlan && <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm"><p className="font-semibold">{selectedPlan.name}</p><div className="mt-2 grid grid-cols-2 gap-y-1 text-muted-foreground sm:grid-cols-4"><span>Duration</span><span className="font-medium text-foreground">{selectedPlan.duration_months} months</span><span>Price</span><span className="font-medium text-foreground">{formatCurrency(selectedPlan.price)}</span><span>GST ({selectedPlan.gst_percent}%)</span><span className="font-medium text-foreground">{formatCurrency(Math.round(selectedPlan.price * selectedPlan.gst_percent / 100))}</span><span>Total</span><span className="font-bold text-foreground">{formatCurrency(selectedPlan.price + Math.round(selectedPlan.price * selectedPlan.gst_percent / 100))}</span></div></div>}</div>}
      {step === 5 && <div><h2 className="mb-5 text-base font-semibold">Payment</h2>{selectedPlan && <div className="mb-4 rounded-xl border bg-muted/40 p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Plan price</span><span>{formatCurrency(planPrice)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(gstAmt)}</span></div><div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>Total due</span><span>{formatCurrency(totalAmt)}</span></div></div>}<div className="grid gap-4 md:grid-cols-2"><label className={fieldClass}>Payment amount *<Input {...register("payment_amount")} type="number" min="0" step="1" placeholder="0" />{errors.payment_amount && <p className="text-xs text-red-600">{errors.payment_amount.message}</p>}</label><label className={fieldClass}>Payment method<select {...register("payment_method")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="online">Online</option></select></label><label className={cn(fieldClass, "md:col-span-2")}>Transaction reference<Input {...register("transaction_ref")} placeholder="UPI ID, card last 4 digits, etc." /></label></div></div>}
      {step === 6 && <div><h2 className="mb-5 text-base font-semibold">Trainer Assignment</h2><label className={fieldClass}>Assign trainer<select {...register("assigned_trainer_id")} className="mt-1 h-10 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="">Not assigned</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label><p className="mt-3 text-xs text-muted-foreground">Trainer assignment is optional and can be changed anytime from the member profile.</p></div>}
      {step === 7 && <div><h2 className="mb-4 text-base font-semibold">Review & Confirm</h2><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal</p>{row("Name", data.full_name)}{row("Phone", data.phone ? `+91 ${String(data.phone).replace(/^\+91/, "")}` : undefined)}{row("Email", data.email)}{row("Gender", data.gender)}{row("Date of birth", data.date_of_birth)}{row("Branch", branches.find((branch) => branch.id === data.branch_id)?.name)}</div><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membership & Payment</p>{row("Package", selectedPlan?.name)}{row("Start date", data.start_date)}{row("Total amount", selectedPlan ? formatCurrency(totalAmt) : undefined)}{row("Payment amount", data.payment_amount !== undefined && data.payment_amount !== null ? formatCurrency(Number(data.payment_amount)) : undefined)}{row("Payment method", data.payment_method)}{row("Trainer", trainers.find((trainer) => trainer.id === data.assigned_trainer_id)?.name)}</div><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medical</p>{row("Height", data.height_cm ? `${data.height_cm} cm` : undefined)}{row("Weight", data.weight_kg ? `${data.weight_kg} kg` : undefined)}{row("Blood group", data.blood_group)}{row("Fitness goal", data.fitness_goal)}{row("Medical conditions", data.medical_conditions)}</div><div className="rounded-xl border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emergency Contact</p>{row("Name", data.emergency_contact_name)}{row("Phone", data.emergency_contact_phone ? `+91 ${String(data.emergency_contact_phone).replace(/^\+91/, "")}` : undefined)}</div></div></div>}
      {step === 8 && <div className="grid min-h-[240px] place-items-center text-center">{isPending ? <div className="flex flex-col items-center gap-3"><LoaderCircle className="size-10 animate-spin text-primary" /><p className="font-medium">Registering member...</p><p className="text-sm text-muted-foreground">Please wait while we save the profile.</p></div> : <div className="flex flex-col items-center gap-3"><div className="grid size-16 place-items-center rounded-2xl bg-primary/10"><Save className="size-8 text-primary" /></div><p className="text-lg font-semibold">Ready to register</p><p className="max-w-sm text-sm text-muted-foreground">Click <strong>Register Member</strong> to create the profile and save the package and payment details.</p></div>}</div>}
    </div>
    <div className="flex items-center justify-between border-t pt-4"><Button type="button" variant="outline" onClick={step === 1 ? () => history.back() : () => setStep((current) => Math.max(current - 1, 1))} disabled={isPending}><ChevronLeft className="size-4" />{step === 1 ? "Cancel" : "Back"}</Button>{step < 7 && <Button type="button" onClick={goNext}>Next<ChevronRight className="size-4" /></Button>}{step === 7 && <Button type="button" onClick={() => setStep(8)}>Confirm & Save<ChevronRight className="size-4" /></Button>}{step === 8 && <Button type="button" onClick={onSubmit} disabled={isPending}>{isPending ? <><LoaderCircle className="size-4 animate-spin" />Saving...</> : <><Save className="size-4" />Register Member</>}</Button>}</div>
  </div>;
}
