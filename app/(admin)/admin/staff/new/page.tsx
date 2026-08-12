import { redirect } from "next/navigation";

// The Add Staff form is now a slide-over panel on the main staff page.
export default function NewStaffRedirect() {
  redirect("/admin/staff");
}
