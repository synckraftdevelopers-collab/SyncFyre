import { getCurrentProfile } from "@/lib/auth";
import { BankAccountForm } from "@/components/finance/bank-account-form";

export const metadata = { title: "Add Bank Account" };

export default async function NewBankAccountPage() {
  const profile = await getCurrentProfile();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Bank Account</h1>
        <p className="text-sm text-muted-foreground">Link a new bank account to track transactions</p>
      </div>
      <BankAccountForm branchId={profile?.branch_id ?? ""} />
    </div>
  );
}
