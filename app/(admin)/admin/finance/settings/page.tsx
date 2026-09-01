import { redirect } from "next/navigation";

export default function FinanceSettingsPage() {
  redirect("/admin/settings?tab=application");
}
