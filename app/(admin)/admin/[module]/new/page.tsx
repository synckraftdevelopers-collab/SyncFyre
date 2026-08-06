import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm, type FormField } from "@/components/modules/resource-create-form";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const titles: Record<string, string> = {
  memberships: "Create membership plan", appointments: "Book appointment", trainers: "Add trainer",
  workouts: "Create workout", "diet-plans": "Create diet plan", progress: "Record member progress",
  payments: "Collect payment", staff: "Add staff member", equipment: "Add equipment",
  notifications: "Create notification", "face-machines": "Add face machine",
};

export default async function AdminNewResourcePage({ params }: { params: Promise<{ module: string }> }) {
  await requireUser(["admin", "manager"]);
  const moduleKey = (await params).module;
  if (!titles[moduleKey]) notFound();

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [membersResult, usersResult, staffResult] = await Promise.all([
    supabase.from("members").select("id,full_name,member_code").eq("status", "active").order("full_name"),
    supabase.from("users").select("id,full_name,email").order("full_name"),
    supabase.from("staff").select("id,users(full_name)").eq("status", "active"),
  ]);
  const members = (membersResult.data ?? []).map(i => ({ value: i.id, label: `${i.full_name} (${i.member_code})` }));
  const users   = (usersResult.data   ?? []).map(i => ({ value: i.id, label: i.full_name || i.email || i.id }));
  const staff   = (staffResult.data   ?? []).map(i => ({ value: i.id, label: (i.users as unknown as { full_name: string } | null)?.full_name ?? i.id }));

  const fields: Record<string, FormField[]> = {
    memberships:    [{ name:"name",label:"Plan name",required:true },{ name:"duration_months",label:"Duration (months)",type:"number",required:true },{ name:"price",label:"Base price (₹)",type:"number",required:true },{ name:"gst_percent",label:"GST (%)",type:"number",defaultValue:18 },{ name:"discount_percent",label:"Discount (%)",type:"number",defaultValue:0 },{ name:"features",label:"Features",type:"tags" }],
    appointments:   [{ name:"member_id",label:"Member",type:"select",options:members,required:true },{ name:"provider_staff_id",label:"Provider",type:"select",options:staff },{ name:"provider_type",label:"Provider type",type:"select",required:true,options:[{label:"Trainer",value:"trainer"},{label:"Dietician",value:"dietician"},{label:"Physiotherapist",value:"physiotherapist"}] },{ name:"appointment_date",label:"Date",type:"date",required:true,defaultValue:today },{ name:"start_time",label:"Start time",type:"time",required:true },{ name:"end_time",label:"End time",type:"time",required:true },{ name:"purpose",label:"Purpose",type:"textarea" }],
    trainers:       [{ name:"user_id",label:"User account",type:"select",options:users,required:true },{ name:"specializations",label:"Specializations",type:"tags" },{ name:"experience_years",label:"Experience (years)",type:"number",defaultValue:0 },{ name:"certifications",label:"Certifications",type:"tags" },{ name:"bio",label:"Biography",type:"textarea" }],
    workouts:       [{ name:"member_id",label:"Member",type:"select",options:members,required:true },{ name:"name",label:"Workout name",required:true },{ name:"exercise_name",label:"Exercise",required:true },{ name:"sets",label:"Sets",type:"number" },{ name:"reps",label:"Repetitions",type:"number" },{ name:"weight_kg",label:"Weight (kg)",type:"number" },{ name:"cardio_minutes",label:"Cardio (min)",type:"number" },{ name:"rest_seconds",label:"Rest (sec)",type:"number" },{ name:"trainer_notes",label:"Trainer notes",type:"textarea" }],
    "diet-plans":   [{ name:"member_id",label:"Member",type:"select",options:members,required:true },{ name:"name",label:"Plan name",required:true },{ name:"start_date",label:"Start date",type:"date",required:true,defaultValue:today },{ name:"end_date",label:"End date",type:"date" },{ name:"breakfast",label:"Breakfast",type:"textarea" },{ name:"lunch",label:"Lunch",type:"textarea" },{ name:"dinner",label:"Dinner",type:"textarea" },{ name:"snacks",label:"Snacks",type:"textarea" },{ name:"calories",label:"Calories",type:"number" },{ name:"protein_g",label:"Protein (g)",type:"number" },{ name:"fat_g",label:"Fat (g)",type:"number" },{ name:"carbs_g",label:"Carbs (g)",type:"number" },{ name:"water_liters",label:"Water (L)",type:"number" }],
    progress:       [{ name:"member_id",label:"Member",type:"select",options:members,required:true },{ name:"measured_at",label:"Date",type:"date",required:true,defaultValue:today },{ name:"weight_kg",label:"Weight (kg)",type:"number" },{ name:"bmi",label:"BMI",type:"number" },{ name:"body_fat_percent",label:"Body fat (%)",type:"number" },{ name:"muscle_mass_kg",label:"Muscle (kg)",type:"number" },{ name:"waist_cm",label:"Waist (cm)",type:"number" },{ name:"chest_cm",label:"Chest (cm)",type:"number" },{ name:"arms_cm",label:"Arms (cm)",type:"number" },{ name:"legs_cm",label:"Legs (cm)",type:"number" },{ name:"notes",label:"Notes",type:"textarea" }],
    payments:       [{ name:"member_id",label:"Member",type:"select",options:members,required:true },{ name:"amount",label:"Amount (₹)",type:"number",required:true },{ name:"method",label:"Method",type:"select",required:true,options:[{label:"Cash",value:"cash"},{label:"UPI",value:"upi"},{label:"Card",value:"card"},{label:"Online",value:"online"}] },{ name:"status",label:"Status",type:"select",options:[{label:"Completed",value:"completed"},{label:"Pending",value:"pending"}],defaultValue:"completed" },{ name:"transaction_reference",label:"Reference" }],
    staff:          [{ name:"user_id",label:"User account",type:"select",options:users,required:true },{ name:"employee_code",label:"Employee code",required:true },{ name:"designation",label:"Designation",required:true },{ name:"joining_date",label:"Joining date",type:"date",required:true,defaultValue:today },{ name:"salary",label:"Salary (₹)",type:"number",required:true },{ name:"leave_balance",label:"Leave balance",type:"number",defaultValue:0 }],
    equipment:      [{ name:"machine_name",label:"Machine name",required:true },{ name:"category",label:"Category",required:true },{ name:"serial_number",label:"Serial number" },{ name:"purchase_date",label:"Purchase date",type:"date" },{ name:"warranty_until",label:"Warranty until",type:"date" },{ name:"next_maintenance_date",label:"Next maintenance",type:"date" },{ name:"notes",label:"Notes",type:"textarea" }],
    notifications:  [{ name:"type",label:"Notification type",required:true },{ name:"title",label:"Title",required:true },{ name:"message",label:"Message",type:"textarea",required:true },{ name:"channels",label:"Channels",type:"tags",defaultValue:"dashboard" }],
    "face-machines":[{ name:"machine_name",label:"Machine name",required:true },{ name:"device_id",label:"Device ID",required:true },{ name:"machine_ip",label:"Machine IP" },{ name:"machine_api_url",label:"API URL" },{ name:"api_key_encrypted",label:"API key" },{ name:"status",label:"Status",type:"select",defaultValue:"active",options:[{label:"Active",value:"active"},{label:"Inactive",value:"inactive"}] }],
  };

  const resource = moduleKey === "memberships" ? "membership-plans" : moduleKey;
  const returnTo = moduleKey === "face-machines" ? "/admin/settings" : `/admin/${moduleKey}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{titles[moduleKey]}</h1>
        <p className="text-sm text-muted-foreground">Complete the information below. Required fields are validated before saving.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm resource={resource} fields={fields[moduleKey]} returnTo={returnTo} />
        </CardContent>
      </Card>
    </div>
  );
}
