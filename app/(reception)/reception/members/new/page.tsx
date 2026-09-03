import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { AddMemberWizard } from "@/components/members/add-member-wizard";
import { getMemberFormConfiguration } from "@/services/member-form-config.service";
import { BackButton } from "@/components/ui/back-button";
import {
  getBranchOptions,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";

export const metadata = { title: "Register Member" };

export default async function ReceptionNewMemberPage() {
  const profile = await requireUser(["reception", "admin", "manager"]);
  const branchId = profile.branch_id;

  const [branches, plans, trainers, memberFormFields] = await Promise.all([
    getBranchOptions({ tenantId: profile.tenant_id, branchId: profile.branch_id, role: profile.role?.slug }),
    getPlanOptions(branchId),
    getTrainerOptions(branchId),
    profile.tenant_id ? getMemberFormConfiguration(profile.tenant_id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <BackButton href="/reception/members" confirmOnLeave />
        <h1 className="mt-2 text-2xl font-bold">Register Member</h1>
        <p className="text-sm text-muted-foreground">
          Complete the wizard using this gym&apos;s configured member fields.
        </p>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <AddMemberWizard
            branches={branches}
            plans={plans}
            trainers={trainers}
            memberFormFields={memberFormFields}
            basePath="/reception/members"
          />
        </CardContent>
      </Card>
    </div>
  );
}
