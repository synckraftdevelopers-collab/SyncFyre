import { Card, CardContent } from "@/components/ui/card";
import { ResourceCreateForm } from "@/components/modules/resource-create-form";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New Appointment" };

export default async function TrainerNewAppointmentPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: trainerRecord } = await supabase
    .from("trainers").select("id").eq("user_id", profile?.id ?? "").single();
  const trainerId = trainerRecord?.id ?? "";

  const { data: membersData } = await supabase
    .from("members").select("id,full_name,member_code")
    .eq("assigned_trainer_id", trainerId)
    .eq("status", "active").order("full_name");

  const members = (membersData ?? []).map((m) => ({ value: m.id, label: `${m.full_name} (${m.member_code})` }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">New appointment</h1>
        <p className="text-sm text-muted-foreground">Schedule a session with one of your assigned members.</p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <ResourceCreateForm
            resource="appointments"
            returnTo="/trainer/appointments"
            fields={[
              { name: "member_id", label: "Member", type: "select", options: members, required: true },
              { name: "provider_type", label: "Session type", type: "select", required: true, options: [{ label: "Trainer", value: "trainer" }, { label: "Dietician", value: "dietician" }] },
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
