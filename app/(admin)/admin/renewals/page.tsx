import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getExpiringMemberships } from "@/services/dashboard.service";

export const metadata = { title: "Renewals Due" };

export default async function RenewalsDuePage() {
  const profile = await requireUser(["admin", "manager", "reception"]);
  
  // Fetch only the strictly filtered expiring memberships from the backend
  const expiringMemberships = await getExpiringMemberships(profile.branch_id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Renewals Due</h1>
        <p className="text-sm text-muted-foreground">
          Memberships expiring within the next 30 days.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Expiring Memberships ({expiringMemberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expiringMemberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <div className="mb-3 grid size-12 place-items-center rounded-full bg-muted">
                <AlertCircle className="size-6 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-foreground">No memberships expiring within 30 days</p>
              <p>All active member subscriptions are well within their validity period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Renewal Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expiringMemberships.map((sub) => {
                    const endDate = new Date(sub.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    const daysRemaining = differenceInDays(endDate, today);
                    
                    let badgeVariant: "default" | "warning" | "danger" = "default";
                    if (daysRemaining <= 7) badgeVariant = "danger";
                    else if (daysRemaining <= 15) badgeVariant = "warning";

                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/members/${sub.member_id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {sub.members?.full_name ?? "Unknown"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {sub.members?.member_code} • {sub.members?.phone ?? "No phone"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {sub.membership_plans?.name ?? "Custom Plan"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="capitalize">
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(sub.total_amount))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(sub.start_date), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                          {format(endDate, "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={badgeVariant}>
                            {daysRemaining === 0 ? "Expires today" : `${daysRemaining} days`}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
