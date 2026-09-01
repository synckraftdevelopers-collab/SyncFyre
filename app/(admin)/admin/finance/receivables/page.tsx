import { redirect } from "next/navigation";

export default function FinanceReceivablesPage() {
  redirect("/admin/finance/outstanding");
}
