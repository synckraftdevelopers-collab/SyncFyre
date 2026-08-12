import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffDashboard } from "@/components/staff/staff-dashboard";

export const metadata = { title: "Staff" };

const STAFF_ROLE_SLUGS = new Set(["reception", "trainer", "dietician", "manager"]);

type Role = { name: string | null; slug: string | null };
type StaffUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  branch_id: string | null;
  status: string;
  roles: Role | Role[] | null;
};

function firstRole(role: StaffUser["roles"]): Role | null {
  return Array.isArray(role) ? role[0] ?? null : role;
}

export default async function AdminStaffPage() {
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();

  const { data: staffRows } = await supabase
    .from("staff")
    .select("*, users(id, full_name, email, avatar_url, branch_id, status, roles(name, slug)), branches(name)")
    .eq("branch_id", profile.branch_id)
    .order("employee_code");

  const [{ data: branches }, { data: roles }, { data: users }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("roles")
      .select("id, name, slug")
      .in("slug", ["reception", "trainer", "dietician", "manager"])
      .order("name"),
    supabase
      .from("users")
      .select("id, full_name, email, avatar_url, branch_id, status, roles(name, slug)")
      .eq("branch_id", profile.branch_id)
      .order("full_name"),
  ]);

  const physicalStaff = staffRows ?? [];
  const staffUserIds = new Set(physicalStaff.map((staff) => staff.user_id));
  const registeredStaffWithoutRecord = ((users ?? []) as StaffUser[])
    .filter((user) => {
      const role = firstRole(user.roles);
      return !staffUserIds.has(user.id) && STAFF_ROLE_SLUGS.has(role?.slug ?? "");
    })
    .map((user) => ({
      id: `registered-${user.id}`,
      employee_code: "",
      designation: null,
      joining_date: null,
      salary: null,
      status: user.status,
      users: {
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        roles: firstRole(user.roles),
      },
      branches: null,
    }));

  return (
    <StaffDashboard
      staffRows={[...physicalStaff, ...registeredStaffWithoutRecord]}
      branches={branches ?? []}
      roles={roles ?? []}
      hasServiceKey={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      isAdmin={profile.role?.slug === "admin"}
    />
  );
}