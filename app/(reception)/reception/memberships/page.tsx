import { requireUser } from "@/lib/auth";
import { ModuleOverview } from "@/components/modules/module-overview";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Memberships" };

export default async function ReceptionMembershipsPage() {
  await requireUser(["reception"]);
  return (
    <ModuleOverview
      config={{
        title: "Memberships",
        description: "View available plans and register member subscriptions.",
        icon: ShieldCheck,
        action: "New subscription",
        features: [
          { title: "View plans", description: "Browse all active membership plans and their pricing." },
          { title: "New subscription", description: "Register a new subscription for a member at the desk." },
          { title: "Renewals", description: "Process renewals and collect payments in one step." },
        ],
      }}
      actionHref="/reception/memberships/new"
    />
  );
}
