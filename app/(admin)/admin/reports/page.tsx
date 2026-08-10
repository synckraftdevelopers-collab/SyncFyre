import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const reports = [
  ["Members", "Member register, plan and status overview", "/admin/reports/members", "members"],
  ["Payments", "Payments by method, status and date", "/admin/reports/payments", "payments"],
  ["Revenue", "Monthly gross, refunds and net revenue", "/admin/reports/revenue", "revenue"],
  ["Attendance", "Attendance records by date", "/admin/reports/attendance", "attendance"],
  ["Membership", "Subscription history", "/admin/subscriptions", "memberships"],
  ["Trainers", "Trainer workload overview", "/admin/trainers", "trainers"],
  ["Monthly Joining", "New member trends", "/admin/members", "monthly_joining"],
  ["Pending Payments", "Outstanding balances", "/admin/finance/outstanding", "pending_payments"],
  ["Subscriptions", "Plan subscription summary", "/admin/subscriptions", "subscriptions"],
] as const;
export const metadata = { title: "Reports" };
export default function AdminReportsPage() { return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-muted-foreground">Operational reports and CSV exports for your branch.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{reports.map(([title, description, href, resource]) => <Card key={title}><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" />{title}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{description}</p><div className="flex gap-2"><Link href={href} className={buttonVariants({ size: "sm" })}>View Report</Link><a href={`/api/reports?resource=${resource}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Download className="size-3.5" /> Export CSV</a></div></CardContent></Card>)}</div></div>; }
