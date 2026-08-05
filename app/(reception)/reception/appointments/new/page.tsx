import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Book Appointment" };

export default async function ReceptionNewAppointmentPage() {
  await requireUser(["reception"]);
  const supabase = await createClient();

  const [membersRes, staffRes] = await Promise.all([
    supabase.from("members").select("id,full_name,member_code").eq("status", "active").order("full_name"),
    supabase.from("staff").select("id,users(full_name)").eq("status", "active"),
  ]);

  if (!membersRes.data) notFound();

  const members = (membersRes.data ?? []).map((m) => ({ value: m.id, label: `${m.full_name} (${m.member_code})` }));
  const staff = (staffRes.data ?? []).map((s) => ({ value: s.id, label: (s.users as unknown as { full_name: string } | null)?.full_name ?? s.id }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Book appointment</h1>
        <p className="text-sm text-muted-foreground">Schedule a session for a member.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="appointments"
            returnTo="/reception/appointments"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "provider_staff_id", label: "Provider", type: "select", options: staff },
              { name: "provider_type", label: "Provider type", type: "select", required: true, options: [{ label: "Trainer", value: "trainer" }, { label: "Dietician", value: "dietician" }, { label: "Physiotherapist", value: "physiotherapist" }] },
              { name: "appointment_date", label: "Date", type: "date", required: true, defaultValue: today },
              { name: "start_time", label: "Start time", type: "time", required: true },
              { name: "end_time", label: "End time", type: "time", required: true },
              { name: "purpose", label: "Purpose", type: "textarea" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
