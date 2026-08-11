import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { AddMemberWizard } from "@/components/members/add-member-wizard";
import {
  getBranchOptions,
  getPlanOptions,
  getTrainerOptions,
} from "@/services/member-extended.service";

export const metadata = { title: "Register Member" };

export default async function AdminNewMemberPage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const branchId = profile.branch_id;

  const [branches, plans, trainers] = await Promise.all([
    getBranchOptions(),
    getPlanOptions(branchId),
    getTrainerOptions(branchId),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Register Member</h1>
        <p className="text-sm text-muted-foreground">
          Complete the 8-step wizard. A member code is generated automatically on save.
        </p>
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-semibold text-primary">Required to register:</span>{" "}
          Full name, package, start date, and payment amount.
        </div>
      </div>
      <Card>
        <CardContent className="p-5 md:p-7">
          <AddMemberWizard
            branches={branches}
            plans={plans}
            trainers={trainers}
            basePath="/admin/members"
          />
        </CardContent>
      </Card>
    </div>
  );
}
