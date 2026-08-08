import { requireUser } from "@/lib/auth";
import { listExpenseCategories, listVendors } from "@/services/finance.service";
import { ExpenseForm } from "@/components/finance/expense-form";

export const metadata = { title: "Add Expense" };

export default async function NewExpensePage() {
  const profile = await requireUser(["admin", "manager"]);
  const branchId = profile?.branch_id ?? "";

  const [categories, { data: vendors }] = await Promise.all([
    listExpenseCategories(branchId),
    listVendors({ branchId, pageSize: 200 }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Expense</h1>
        <p className="text-sm text-muted-foreground">Submit a new expense for approval</p>
      </div>
      <ExpenseForm branchId={branchId} categories={categories} vendors={vendors} />
    </div>
  );
}
