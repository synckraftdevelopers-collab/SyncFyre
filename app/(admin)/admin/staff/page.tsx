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
  const profile = await requireUser(["owner", "admin", "manager"]);
  const supabase = await createClient();

  // Scope queries — owners/admins see all branches in their tenant,
  // managers see only their branch. Fall back to branch_id scope if
  // tenant_id is not available (legacy accounts).
  const isManager = profile.role?.slug === "manager";
  const tenantId = profile.tenant_id;
  const branchId = profile.branch_id;

  // Staff query — scope by tenant when available, fall back to branch
  let staffQuery = supabase
    .from("staff")
    .select("*, users(id, full_name, email, avatar_url, branch_id, status, roles(name, slug)), branches(name)")
    .eq("status", "active")
    .order("employee_code");

  if (isManager && branchId) {
    staffQuery = staffQuery.eq("branch_id", branchId);
  } else if (tenantId) {
    staffQuery = staffQuery.eq("tenant_id", tenantId);
  } else if (branchId) {
    staffQuery = staffQuery.eq("branch_id", branchId);
  }

  const { data: staffRows } = await staffQuery;

  // Branches — scoped to tenant or branch
  let branchQuery = supabase
    .from("branches")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  if (tenantId) branchQuery = branchQuery.eq("tenant_id", tenantId);
  else if (branchId) branchQuery = branchQuery.eq("id", branchId);

  // Roles list
  const rolesQuery = supabase
    .from("roles")
    .select("id, name, slug")
    .in("slug", ["reception", "trainer", "dietician", "manager"])
    .order("name");

  // Users — for detecting registered users without a staff record
  let usersQuery = supabase
    .from("users")
    .select("id, full_name, email, avatar_url, branch_id, status, roles(name, slug)")
    .eq("status", "active")
    .order("full_name");
  if (isManager && branchId) {
    usersQuery = usersQuery.eq("branch_id", branchId);
  } else if (tenantId) {
    usersQuery = usersQuery.eq("tenant_id", tenantId);
  } else if (branchId) {
    usersQuery = usersQuery.eq("branch_id", branchId);
  }

  const [{ data: branches }, { data: roles }, { data: users }] = await Promise.all([
    branchQuery,
    rolesQuery,
    usersQuery,
  ]);

  const physicalStaff = (staffRows ?? []).map((staff) => ({
    ...staff,
    source_user_id: staff.user_id,
    branch_name: staff.branches?.name ?? null,
  }));

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
      source_user_id: user.id,
      branch_name: null,
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
      isAdmin={
        profile.role?.slug === "owner" ||
        profile.role?.slug === "admin" ||
        profile.role?.slug === "manager"
      }
    />
  );
}
