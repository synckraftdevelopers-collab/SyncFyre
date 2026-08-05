import { getCurrentProfile } from "@/lib/auth";
import { listIncomeCategories } from "@/services/finance.service";
import { IncomeForm } from "@/components/finance/income-form";

export const metadata = { title: "Add Income" };

export default async function NewIncomePage() {
  const profile = await getCurrentProfile();
  const categories = await listIncomeCategories(profile?.branch_id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Income</h1>
        <p className="text-sm text-muted-foreground">Record a new income entry</p>
      </div>
      <IncomeForm
        branchId={profile?.branch_id ?? ""}
        categories={categories}
      />
    </div>
  );
}
