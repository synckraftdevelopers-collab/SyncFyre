import Link from "next/link";
import { ChevronLeft, ChevronRight, Cog, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Equipment" };
const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "outline"> = { operational: "success", maintenance_due: "warning", under_maintenance: "default", out_of_service: "danger", retired: "outline" };

export default async function AdminEquipmentPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager"]);
  const supabase = await createClient();
  let query = supabase.from("equipment").select("*").eq("branch_id", profile.branch_id).order("machine_name");
  if (sp.q) query = query.ilike("machine_name", `%${sp.q.replace(/[%_]/g, "")}%`);
  if (sp.status && sp.status !== "all") query = query.eq("status", sp.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const items = data ?? [];
  const pageSize = 20; const page = Math.max(1, Number(sp.page ?? 1)); const totalPages = Math.max(1, Math.ceil(items.length / pageSize)); const rows = items.slice((page - 1) * pageSize, page * pageSize);
  const url = (next: number) => { const params = new URLSearchParams(); if (sp.q) params.set("q", sp.q); if (sp.status && sp.status !== "all") params.set("status", sp.status); params.set("page", String(next)); return `/admin/equipment?${params}`; };
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Equipment</h1><p className="text-sm text-muted-foreground">Track gym machines, warranties, and maintenance.</p></div><Link href="/admin/equipment/new" className={buttonVariants({ className: "ml-auto" })}><Plus className="size-4" /> Add Equipment</Link></div><Card><form className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={sp.q} className="pl-9" placeholder="Search machine name" /></div><select name="status" defaultValue={sp.status ?? "all"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="operational">Operational</option><option value="maintenance_due">Maintenance due</option><option value="under_maintenance">Under maintenance</option><option value="out_of_service">Out of service</option><option value="retired">Retired</option></select><button className={buttonVariants({ variant: "outline" })}>Apply</button></form>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>{["Machine Name", "Category", "Serial Number", "Purchase Date", "Warranty Until", "Next Maintenance", "Status"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((item) => <tr key={item.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-medium">{item.machine_name}</td><td className="px-4 py-3">{item.category}</td><td className="px-4 py-3 font-mono text-xs">{item.serial_number ?? "—"}</td><td className="px-4 py-3">{item.purchase_date ?? "—"}</td><td className="px-4 py-3">{item.warranty_until ?? "—"}</td><td className="px-4 py-3">{item.next_maintenance_date ?? "—"}</td><td className="px-4 py-3"><Badge variant={statusVariant[item.status] ?? "outline"}>{item.status.replaceAll("_", " ")}</Badge></td></tr>)}</tbody></table></div> : <CardContent className="grid min-h-64 place-items-center text-center"><div><Cog className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-medium">No equipment added yet</p><p className="text-sm text-muted-foreground">Add your first machine to begin tracking it.</p></div></CardContent>}<div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground"><span>{items.length} machine{items.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span><Link href={url(page - 1)} aria-disabled={page <= 1} className={buttonVariants({ variant: "outline", size: "icon" }) + (page <= 1 ? " pointer-events-none opacity-40" : "")}><ChevronLeft className="size-4" /></Link><Link href={url(page + 1)} aria-disabled={page >= totalPages} className={buttonVariants({ variant: "outline", size: "icon" }) + (page >= totalPages ? " pointer-events-none opacity-40" : "")}><ChevronRight className="size-4" /></Link></div></div></Card></div>;
}
