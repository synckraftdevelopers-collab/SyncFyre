import { completePtSessionAction, createPtPackageAction, schedulePtSessionAction, sellPtPackageAction } from "@/app/actions/pt-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { createClient } from "@/lib/supabase/server";
import { SortableTh, readSort } from "@/components/ui/sortable-th";
import { Lock } from "lucide-react";

export const metadata = { title: "Personal Training" };
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const CREDIT_SORTABLE_COLUMNS = [
  { label: "Member", column: "member" as const },
  { label: "Package", column: "package" as const },
  { label: "Used", column: "used" as const },
  { label: "Expires", column: "expires" as const },
  { label: "Status", column: "status" as const },
];

const SESSION_SORTABLE_COLUMNS = [
  { label: "Member", column: "member" as const },
  { label: "Package", column: "package" as const },
  { label: "Session time", column: "session_at" as const },
  { label: "Status", column: "status" as const },
];

export default async function PtPage({
  searchParams,
}: {
  searchParams: Promise<{ creditSort?: string; creditDir?: string; sessionSort?: string; sessionDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["owner", "admin", "manager", "reception", "trainer"]);

  // Page-level soft gate — mirrors the same pattern used by
  // /admin/whatsapp/templates and /admin/developer. Middleware already blocks
  // direct URL access; this ensures the page component never renders PT data
  // if the feature is disabled via a tenant_features override.
  const hasPt = await hasCurrentFeature("pt");
  if (!hasPt) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Personal Training</h1>
          <p className="text-sm text-muted-foreground">PT session credits, packages, and trainer performance</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">PT and trainer management</p>
              <p className="text-sm text-muted-foreground">
                Not available on your current plan. Upgrade to Growth to manage PT packages, session credits,
                and trainer performance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile.tenant_id || !profile.branch_id) return <p className="text-sm text-muted-foreground">Your account is not assigned to a branch.</p>;
  const supabase = await createClient();
  const [packagesRes, membersRes, trainersRes, creditsRes, sessionsRes] = await Promise.all([
    supabase.from("pt_packages").select("id,name,session_count,price,validity_days,status").eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).order("name"),
    supabase.from("members").select("id,full_name,member_code").eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).eq("status", "active").order("full_name").limit(300),
    supabase.from("trainers").select("id,users(full_name)").eq("branch_id", profile.branch_id).eq("status", "active"),
    supabase.from("pt_member_packages").select("id,member_id,trainer_id,purchased_sessions,used_sessions,expires_at,status,members(full_name,member_code),pt_packages(name)").eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).order("created_at", { ascending: false }).limit(100),
    supabase.from("pt_sessions").select("id,member_package_id,session_at,status,pt_member_packages(members(full_name),pt_packages(name))").eq("tenant_id", profile.tenant_id).eq("branch_id", profile.branch_id).order("session_at", { ascending: true }).limit(100),
  ]);
  const packages = packagesRes.data ?? []; const members = membersRes.data ?? []; const trainers = trainersRes.data ?? [];
  let credits: any[] = creditsRes.data ?? []; let sessions: any[] = sessionsRes.data ?? [];

  const { sort: creditSort, dir: creditDir } = readSort(
    sp as Record<string, string | undefined>,
    CREDIT_SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "creditSort", dir: "creditDir" },
  );
  if (creditSort) {
    const dirMul = creditDir === "desc" ? -1 : 1;
    const sortValue = (credit: (typeof credits)[number]): string | number => {
      switch (creditSort) {
        case "member": return credit.members?.full_name ?? "";
        case "package": return credit.pt_packages?.name ?? "";
        case "used": return credit.used_sessions ?? 0;
        case "expires": return credit.expires_at ?? "";
        case "status": return credit.status ?? "";
        default: return "";
      }
    };
    credits = [...credits].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

  const { sort: sessionSort, dir: sessionDir } = readSort(
    sp as Record<string, string | undefined>,
    SESSION_SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "sessionSort", dir: "sessionDir" },
  );
  if (sessionSort) {
    const dirMul = sessionDir === "desc" ? -1 : 1;
    const sortValue = (session: (typeof sessions)[number]): string => {
      switch (sessionSort) {
        case "member": return session.pt_member_packages?.members?.full_name ?? "";
        case "package": return session.pt_member_packages?.pt_packages?.name ?? "";
        case "session_at": return session.session_at ?? "";
        case "status": return session.status ?? "";
        default: return "";
      }
    };
    sessions = [...sessions].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * dirMul);
  }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Personal Training</h1><p className="text-sm text-muted-foreground">Sell session credits, schedule PT sessions, and track credit use.</p></div><div className="grid gap-5 xl:grid-cols-3"><Card><CardHeader><CardTitle>PT package</CardTitle></CardHeader><CardContent><form action={async (data) => { "use server"; await createPtPackageAction(data); }} className="space-y-3"><input name="name" required placeholder="Package name" className="h-10 w-full rounded border bg-background px-3 text-sm" /><input name="session_count" type="number" min="1" required placeholder="Sessions" className="h-10 w-full rounded border bg-background px-3 text-sm" /><input name="price" type="number" min="0" step="0.01" required placeholder="Price" className="h-10 w-full rounded border bg-background px-3 text-sm" /><input name="validity_days" type="number" min="1" defaultValue="90" required placeholder="Validity days" className="h-10 w-full rounded border bg-background px-3 text-sm" /><button className="h-10 w-full rounded bg-primary text-sm font-medium text-primary-foreground">Create package</button></form></CardContent></Card><Card><CardHeader><CardTitle>Sell PT credits</CardTitle></CardHeader><CardContent><form action={async (data) => { "use server"; await sellPtPackageAction(data); }} className="space-y-3"><select name="member_id" required className="h-10 w-full rounded border bg-background px-3 text-sm"><option value="">Member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}</select><select name="package_id" required className="h-10 w-full rounded border bg-background px-3 text-sm"><option value="">PT package</option>{packages.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.session_count} sessions</option>)}</select><select name="trainer_id" className="h-10 w-full rounded border bg-background px-3 text-sm"><option value="">Trainer (optional)</option>{trainers.map((trainer: any) => <option key={trainer.id} value={trainer.id}>{trainer.users?.full_name ?? "Trainer"}</option>)}</select><button className="h-10 w-full rounded bg-primary text-sm font-medium text-primary-foreground">Add credits</button></form></CardContent></Card><Card><CardHeader><CardTitle>Schedule session</CardTitle></CardHeader><CardContent><form action={async (data) => { "use server"; await schedulePtSessionAction(data); }} className="space-y-3"><select name="member_package_id" required className="h-10 w-full rounded border bg-background px-3 text-sm"><option value="">Active PT credits</option>{credits.filter((credit: any) => credit.status === "active" && credit.used_sessions < credit.purchased_sessions).map((credit: any) => <option key={credit.id} value={credit.id}>{credit.members?.full_name ?? "Member"} · {credit.purchased_sessions - credit.used_sessions} remaining</option>)}</select><input name="session_at" type="datetime-local" required className="h-10 w-full rounded border bg-background px-3 text-sm" /><select name="trainer_id" className="h-10 w-full rounded border bg-background px-3 text-sm"><option value="">Assigned trainer</option>{trainers.map((trainer: any) => <option key={trainer.id} value={trainer.id}>{trainer.users?.full_name ?? "Trainer"}</option>)}</select><button className="h-10 w-full rounded bg-primary text-sm font-medium text-primary-foreground">Schedule session</button></form></CardContent></Card></div><Card><CardHeader><CardTitle>Credits</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{CREDIT_SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/pt" searchParams={sp as Record<string, string | undefined>} currentSort={creditSort} currentDir={creditDir} paramNames={{ sort: "creditSort", dir: "creditDir" }} className="p-3 font-medium" />)}</tr></thead><tbody>{credits.map((credit: any) => <tr key={credit.id} className="border-b"><td className="p-3">{credit.members?.full_name}</td><td className="p-3">{credit.pt_packages?.name}</td><td className="p-3">{credit.used_sessions} / {credit.purchased_sessions}</td><td className="p-3">{credit.expires_at}</td><td className="p-3 capitalize">{credit.status}</td></tr>)}</tbody></table></CardContent></Card><Card><CardHeader><CardTitle>Sessions</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr>{SESSION_SORTABLE_COLUMNS.map(({ label, column }) => <SortableTh key={column} label={label} column={column} basePath="/admin/pt" searchParams={sp as Record<string, string | undefined>} currentSort={sessionSort} currentDir={sessionDir} paramNames={{ sort: "sessionSort", dir: "sessionDir" }} className="p-3 font-medium" />)}<th className="p-3"></th></tr></thead><tbody>{sessions.map((session: any) => <tr key={session.id} className="border-b"><td className="p-3">{session.pt_member_packages?.members?.full_name}</td><td className="p-3">{session.pt_member_packages?.pt_packages?.name}</td><td className="p-3">{formatDate(session.session_at)}</td><td className="p-3 capitalize">{session.status}</td><td className="p-3">{session.status === "scheduled" ? <form action={async () => { "use server"; await completePtSessionAction(session.id); }}><button className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white">Complete</button></form> : null}</td></tr>)}</tbody></table></CardContent></Card></div>;
}
