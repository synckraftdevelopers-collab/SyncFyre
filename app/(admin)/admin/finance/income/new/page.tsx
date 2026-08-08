import { requireUser } from "@/lib/auth";
import { listIncomeCategories } from "@/services/finance.service";
import { listMembers } from "@/services/member.service";
import { IncomeForm } from "@/components/finance/income-form";

export const metadata = { title: "Add Income" };

export default async function NewIncomePage() {
  const profile = await requireUser(["admin", "manager"]);
  const branchId = profile?.branch_id ?? "";
  const [categories, { data: members }] = await Promise.all([
    listIncomeCategories(branchId),
    listMembers({ branchId, pageSize: 200, status: "active" }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Income</h1>
        <p className="text-sm text-muted-foreground">Record a new income entry</p>
      </div>
      <IncomeForm
        branchId={branchId}
        categories={categories}
        members={members}
      />
    </div>
  );
}
