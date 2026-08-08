"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Phone,
  HeartPulse,
  CreditCard,
  Wallet,
  Dumbbell,
  ClipboardList,
  Save,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { memberSchema } from "@/lib/validations/member";
import { createMemberAction } from "@/app/actions/member-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  gst_percent: number;
  discount_percent: number;
  duration_months: number;
}

interface Trainer {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface AddMemberWizardProps {
  branches: Branch[];
  plans: Plan[];
  trainers: Trainer[];
  basePath?: string;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Personal",   icon: User         },
  { id: 2, label: "Emergency",  icon: Phone        },
  { id: 3, label: "Medical",    icon: HeartPulse   },
  { id: 4, label: "Membership", icon: CreditCard   },
  { id: 5, label: "Payment",    icon: Wallet       },
  { id: 6, label: "Trainer",    icon: Dumbbell     },
  { id: 7, label: "Review",     icon: ClipboardList },
  { id: 8, label: "Save",       icon: Save         },
] as const;

// ─── Form schema (all fields) ─────────────────────────────────────────────────

const fullSchema = memberSchema.extend({
  // Payment fields (optional, handled separately after member creation)
  plan_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  payment_amount: z.coerce.number().nonnegative().optional().nullable(),
  payment_method: z.enum(["cash", "upi", "card", "online"]).optional().nullable(),
  transaction_ref: z.string().optional().nullable(),
});

type WizardFormData = z.infer<typeof fullSchema>;

const fieldClass = "space-y-1.5 text-sm font-medium";

// ─── Component ────────────────────────────────────────────────────────────────

export function AddMemberWizard({
  branches,
  plans,
  trainers,
  basePath = "/admin/members",
}: AddMemberWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  const form = useForm<WizardFormData>({
    resolver: zodResolver(fullSchema.partial()),
    defaultValues: {
      status: "active",
      gender: undefined,
      plan_id: null,
      payment_method: "cash",
    },
    mode: "onTouched",
  });

  const { watch, register, formState: { errors }, trigger, getValues } = form;
  const watched = watch();

  // Selected plan details
  const selectedPlan = plans.find((p) => p.id === watched.plan_id);
  const planPrice   = selectedPlan?.price ?? 0;
  const gstAmt      = Math.round((planPrice * (selectedPlan?.gst_percent ?? 18)) / 100);
  const totalAmt    = planPrice + gstAmt;

  // ── Navigation ──────────────────────────────────────────────────────────────

  async function goNext() {
    const fieldsForStep: (keyof WizardFormData)[][] = [
      ["full_name", "phone", "branch_id", "email", "gender", "date_of_birth"],
      ["emergency_contact_name", "emergency_contact_phone"],
      ["height_cm", "weight_kg", "blood_group", "medical_conditions", "fitness_goal"],
      ["plan_id", "start_date"],
      ["payment_amount", "payment_method"],
      [],
      [],
      [],
    ];

    const valid = await trigger(fieldsForStep[step - 1] as (keyof WizardFormData)[]);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, 8));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function onSubmit() {
    const data = getValues();
    const formData = new FormData();

    // Only add member fields (skip wizard-only fields)
    const memberFields = [
      "full_name", "phone", "email", "gender", "date_of_birth",
      "address", "branch_id", "status", "height_cm", "weight_kg",
      "blood_group", "medical_conditions", "fitness_goal",
      "emergency_contact_name", "emergency_contact_phone",
      "assigned_trainer_id",
    ] as const;

    for (const k of memberFields) {
      const v = data[k as keyof WizardFormData];
      if (v !== undefined && v !== null && v !== "") {
        formData.set(k, String(v));
      }
    }
    formData.set("status", "active");

    startTransition(async () => {
      const result = await createMemberAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Member registered successfully!");
      // createMemberAction redirects on success — just in case
      router.push(basePath);
    });
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const done    = step > s.id;
          const current = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={s.id > step}
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
                  current && "bg-primary/10",
                  done && "opacity-80 cursor-pointer hover:bg-muted",
                  s.id > step && "opacity-40 cursor-not-allowed",
                )}
              >
                <div
                  className={cn(
                    "grid size-8 place-items-center rounded-full border-2 transition-all",
                    current && "border-primary bg-primary text-white",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    s.id > step && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-6 flex-shrink-0 rounded-full transition-colors",
                    done ? "bg-emerald-500" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[360px]">
        {step === 1 && <StepPersonal register={register} errors={errors} branches={branches} />}
        {step === 2 && <StepEmergency register={register} errors={errors} />}
        {step === 3 && <StepMedical register={register} errors={errors} />}
        {step === 4 && <StepMembership register={register} errors={errors} plans={plans} watched={watched} />}
        {step === 5 && <StepPayment register={register} errors={errors} selectedPlan={selectedPlan} planPrice={planPrice} gstAmt={gstAmt} totalAmt={totalAmt} />}
        {step === 6 && <StepTrainer register={register} errors={errors} trainers={trainers} />}
        {step === 7 && <StepReview data={watched} branches={branches} plans={plans} trainers={trainers} selectedPlan={selectedPlan} totalAmt={totalAmt} />}
        {step === 8 && <StepSave isPending={isPending} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={step === 1 ? () => history.back() : goBack}
          disabled={isPending}
        >
          <ChevronLeft className="size-4" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < 7 && (
          <Button type="button" onClick={goNext}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
        {step === 7 && (
          <Button type="button" onClick={() => setStep(8)}>
            Confirm & Save
            <ChevronRight className="size-4" />
          </Button>
        )}
        {step === 8 && (
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <><LoaderCircle className="size-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="size-4" />Register Member</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Personal ────────────────────────────────────────────────────────

function StepPersonal({ register, errors, branches }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
  branches: Branch[];
}) {
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Personal Information</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className={fieldClass}>
          Full name *
          <Input {...register("full_name")} placeholder="e.g. Rahul Sharma" />
          {errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}
        </label>
        <label className={fieldClass}>
          Phone *
          <Input {...register("phone")} type="tel" placeholder="+91 98765 43210" />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </label>
        <label className={fieldClass}>
          Email
          <Input {...register("email")} type="email" placeholder="rahul@email.com" />
        </label>
        <label className={fieldClass}>
          Gender
          <select {...register("gender")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label className={fieldClass}>
          Date of birth
          <Input {...register("date_of_birth")} type="date" />
        </label>
        <label className={fieldClass}>
          Branch *
          <select {...register("branch_id")} required className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {errors.branch_id && <p className="text-xs text-red-600">{errors.branch_id.message}</p>}
        </label>
        <label className={cn(fieldClass, "md:col-span-2 xl:col-span-3")}>
          Address
          <Input {...register("address")} placeholder="Full address" />
        </label>
      </div>
    </div>
  );
}

// ─── Step 2: Emergency ────────────────────────────────────────────────────────

function StepEmergency({ register, errors }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
}) {
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Emergency Contact</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass}>
          Contact name
          <Input {...register("emergency_contact_name")} placeholder="Parent / Spouse name" />
        </label>
        <label className={fieldClass}>
          Contact phone
          <Input {...register("emergency_contact_phone")} type="tel" placeholder="+91 …" />
        </label>
      </div>
    </div>
  );
}

// ─── Step 3: Medical ──────────────────────────────────────────────────────────

function StepMedical({ register, errors }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
}) {
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Medical Information</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className={fieldClass}>
          Height (cm)
          <Input {...register("height_cm")} type="number" min="1" step="0.1" placeholder="170" />
        </label>
        <label className={fieldClass}>
          Weight (kg)
          <Input {...register("weight_kg")} type="number" min="1" step="0.1" placeholder="70" />
        </label>
        <label className={fieldClass}>
          Blood group
          <Input {...register("blood_group")} placeholder="e.g. O+" />
        </label>
        <label className={fieldClass}>
          Fitness goal
          <Input {...register("fitness_goal")} placeholder="Weight loss, muscle gain…" />
        </label>
        <label className={cn(fieldClass, "md:col-span-2 xl:col-span-2")}>
          Medical conditions
          <Input {...register("medical_conditions")} placeholder="Allergies, injuries, conditions" />
        </label>
      </div>
    </div>
  );
}

// ─── Step 4: Membership Plan ──────────────────────────────────────────────────

function StepMembership({ register, errors, plans, watched }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
  plans: Plan[];
  watched: Partial<WizardFormData>;
}) {
  const selected = plans.find((p) => p.id === watched.plan_id);
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Membership Plan</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass}>
          Select plan
          <select {...register("plan_id")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">No plan — add later</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatCurrency(p.price)} / {p.duration_months}mo
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Start date
          <Input
            {...register("start_date")}
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
      </div>
      {selected && (
        <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-semibold">{selected.name}</p>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-muted-foreground sm:grid-cols-4">
            <span>Duration</span><span className="font-medium text-foreground">{selected.duration_months} months</span>
            <span>Price</span><span className="font-medium text-foreground">{formatCurrency(selected.price)}</span>
            <span>GST ({selected.gst_percent}%)</span>
            <span className="font-medium text-foreground">
              {formatCurrency(Math.round(selected.price * selected.gst_percent / 100))}
            </span>
            <span>Total</span>
            <span className="font-bold text-foreground">
              {formatCurrency(selected.price + Math.round(selected.price * selected.gst_percent / 100))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Payment ──────────────────────────────────────────────────────────

function StepPayment({ register, errors, selectedPlan, planPrice, gstAmt, totalAmt }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
  selectedPlan: Plan | undefined;
  planPrice: number;
  gstAmt: number;
  totalAmt: number;
}) {
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Payment</h2>
      {!selectedPlan && (
        <p className="mb-4 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          No plan selected. You can collect payment later from the member profile.
        </p>
      )}
      {selectedPlan && (
        <div className="mb-4 rounded-xl border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Plan price</span><span>{formatCurrency(planPrice)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(gstAmt)}</span></div>
          <div className="flex justify-between border-t mt-2 pt-2 font-bold text-base"><span>Total due</span><span>{formatCurrency(totalAmt)}</span></div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldClass}>
          Amount collected (₹)
          <Input
            {...register("payment_amount")}
            type="number"
            min="0"
            step="1"
            defaultValue={totalAmt || ""}
            placeholder="0"
          />
        </label>
        <label className={fieldClass}>
          Payment method
          <select {...register("payment_method")} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </label>
        <label className={cn(fieldClass, "md:col-span-2")}>
          Transaction reference
          <Input {...register("transaction_ref")} placeholder="UPI ID, card last 4 digits, etc." />
        </label>
      </div>
    </div>
  );
}

// ─── Step 6: Trainer ──────────────────────────────────────────────────────────

function StepTrainer({ register, errors, trainers }: {
  register: ReturnType<typeof useForm<WizardFormData>>["register"];
  errors: ReturnType<typeof useForm<WizardFormData>>["formState"]["errors"];
  trainers: Trainer[];
}) {
  return (
    <div>
      <h2 className="mb-5 text-base font-semibold">Trainer Assignment</h2>
      <label className={fieldClass}>
        Assign trainer (optional)
        <select {...register("assigned_trainer_id")} className="mt-1 h-10 w-full max-w-sm rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Not assigned</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-xs text-muted-foreground">
        Trainer assignment is optional and can be changed anytime from the member profile.
      </p>
    </div>
  );
}

// ─── Step 7: Review ───────────────────────────────────────────────────────────

function StepReview({
  data,
  branches,
  plans,
  trainers,
  selectedPlan,
  totalAmt,
}: {
  data: Partial<WizardFormData>;
  branches: Branch[];
  plans: Plan[];
  trainers: Trainer[];
  selectedPlan: Plan | undefined;
  totalAmt: number;
}) {
  const branch  = branches.find((b) => b.id === data.branch_id);
  const trainer = trainers.find((t) => t.id === data.assigned_trainer_id);

  const row = (label: string, value: string | undefined | null) => (
    <div key={label} className="flex items-start justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold">Review & Confirm</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal</p>
          {row("Name", data.full_name)}
          {row("Phone", data.phone)}
          {row("Email", data.email)}
          {row("Gender", data.gender)}
          {row("Date of birth", data.date_of_birth)}
          {row("Branch", branch?.name)}
        </div>
        <div className="rounded-xl border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membership & Payment</p>
          {row("Plan", selectedPlan?.name)}
          {row("Start date", data.start_date)}
          {row("Total amount", selectedPlan ? formatCurrency(totalAmt) : undefined)}
          {row("Payment amount", data.payment_amount ? formatCurrency(Number(data.payment_amount)) : undefined)}
          {row("Payment method", data.payment_method)}
          {row("Trainer", trainer?.name)}
        </div>
        <div className="rounded-xl border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medical</p>
          {row("Height", data.height_cm ? `${data.height_cm} cm` : undefined)}
          {row("Weight", data.weight_kg ? `${data.weight_kg} kg` : undefined)}
          {row("Blood group", data.blood_group)}
          {row("Fitness goal", data.fitness_goal)}
          {row("Medical conditions", data.medical_conditions)}
        </div>
        <div className="rounded-xl border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emergency Contact</p>
          {row("Name", data.emergency_contact_name)}
          {row("Phone", data.emergency_contact_phone)}
        </div>
      </div>
    </div>
  );
}

// ─── Step 8: Save ─────────────────────────────────────────────────────────────

function StepSave({ isPending }: { isPending: boolean }) {
  return (
    <div className="grid min-h-[240px] place-items-center text-center">
      {isPending ? (
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="size-10 animate-spin text-primary" />
          <p className="font-medium">Registering member…</p>
          <p className="text-sm text-muted-foreground">Please wait while we save the profile.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10">
            <Save className="size-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">Ready to register</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click <strong>Register Member</strong> to create the profile and generate a member code automatically.
          </p>
        </div>
      )}
    </div>
  );
}
