import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Customization" };

export default async function CustomizationPage() {
  await requireUser(["owner", "admin"]);
  redirect("/admin/settings?tab=customization");
}
