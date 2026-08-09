import Link from "next/link";
import { ChevronLeft, ChevronRight, Gauge, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Progress" };

export default async function AdminProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; from?: string; to?: string; page?: string }>;
}) {
  const profile = await requireUser(["admin", "manager", "reception"]);
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 20;

  let membersQuery = supabase
    .from("members")
    .select("id, full_name, member_code")
    .eq("status", "active")
    .order("full_name");
  if (profile.branch_id) membersQuery = membersQuery.eq("branch_id", profile.branch_id);
  const { data: members, error: membersError } = await membersQuery;
  if (membersError) throw new Error(membersError.message);

  let progressQuery = supabase
    .from("progress")
    .select("id, member_id, measured_at, weight_kg, bmi, body_fat_percent, muscle_mass_kg, waist_cm, chest_cm, arms_cm, legs_cm, notes, members(full_name,member_code)", { count: "exact" })
    .order("measured_at", { ascending: false });
  if (profile.branch_id) progressQuery = progressQuery.eq("branch_id", profile.branch_id);
  if (params.member) progressQuery = progressQuery.eq("member_id", params.member);
  if (params.from) progressQuery = progressQuery.gte("measured_at", params.from);
  if (params.to) progressQuery = progressQuery.lte("measured_at", params.to);

  const from = (page - 1) * pageSize;
  const { data: records, count, error } = await progressQuery.range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.member) query.set("member", params.member);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    query.set("page", String(nextPage));
    return `/admin/progress?${query}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Member Progress</h1>
          <p className="text-sm text-muted-foreground">Track body measurements and fitness progress over time.</p>
        </div>
        <Link href="/admin/progress/new" className={buttonVariants({ className: "ml-auto" })}>
          <Plus className="size-4" />Record progress
        </Link>
      </div>

      <Card>
        <form className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-end">
          <label className="grid gap-1 text-sm font-medium md:min-w-56">
            Member
            <select name="member" defaultValue={params.member ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm">
              <option value="">All members</option>
              {(members ?? []).map((member) => <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            From
            <input name="from" type="date" defaultValue={params.from ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            To
            <input name="to" type="date" defaultValue={params.to ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm" />
          </label>
          <button className={buttonVariants({ variant: "outline" })}>Apply filters</button>
          {(params.member || params.from || params.to) && <Link href="/admin/progress" className={buttonVariants({ variant: "ghost" })}>Clear</Link>}
        </form>

        {records?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>{["Date", "Member", "Weight", "BMI", "Body Fat", "Muscle", "Waist", "Chest", "Arms", "Legs", "Notes"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{record.measured_at}</td>
                    <td className="px-4 py-3 font-medium">{(record.members as unknown as { full_name: string; member_code: string } | null)?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">{record.weight_kg != null ? `${record.weight_kg} kg` : "—"}</td>
                    <td className="px-4 py-3">{record.bmi ?? "—"}</td>
                    <td className="px-4 py-3">{record.body_fat_percent != null ? `${record.body_fat_percent}%` : "—"}</td>
                    <td className="px-4 py-3">{record.muscle_mass_kg != null ? `${record.muscle_mass_kg} kg` : "—"}</td>
                    <td className="px-4 py-3">{record.waist_cm != null ? `${record.waist_cm} cm` : "—"}</td>
                    <td className="px-4 py-3">{record.chest_cm != null ? `${record.chest_cm} cm` : "—"}</td>
                    <td className="px-4 py-3">{record.arms_cm != null ? `${record.arms_cm} cm` : "—"}</td>
                    <td className="px-4 py-3">{record.legs_cm != null ? `${record.legs_cm} cm` : "—"}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{record.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent className="grid min-h-64 place-items-center text-center">
            <div><Gauge className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No progress records found</p><p className="text-sm text-muted-foreground">Record measurements to start tracking member progress.</p></div>
          </CardContent>
        )}

        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{total} record{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span><Link href={pageUrl(page - 1)} aria-disabled={page <= 1} className={buttonVariants({ variant: "outline", size: "icon" }) + (page <= 1 ? " pointer-events-none opacity-40" : "")}><ChevronLeft className="size-4" /></Link><Link href={pageUrl(page + 1)} aria-disabled={page >= totalPages} className={buttonVariants({ variant: "outline", size: "icon" }) + (page >= totalPages ? " pointer-events-none opacity-40" : "")}><ChevronRight className="size-4" /></Link></div>
        </div>
      </Card>
    </div>
  );
}