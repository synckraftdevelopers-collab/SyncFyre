import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { getExpiringMemberships } from "@/services/dashboard.service";
import { SortableTh, readSort } from "@/components/ui/sortable-th";
import { isWhatsAppProviderConfigured } from "@/services/whatsapp.service";
import { hasCurrentFeature } from "@/lib/entitlements/server";
import { sendRenewalReminderWhatsAppAction } from "@/app/actions/whatsapp-actions";
import { RenewalReminderButton } from "@/components/whatsapp/renewal-reminder-button";

export const metadata = { title: "Renewals Due" };

const SORTABLE_COLUMNS = [
  { label: "Member",          column: "member"        as const },
  { label: "Plan",            column: "plan"          as const },
  { label: "Status",          column: "status"        as const },
  { label: "Renewal Amount",  column: "amount"        as const, align: "right" as const },
  { label: "Start Date",      column: "start_date"    as const },
  { label: "Expiry Date",     column: "expiry_date"   as const },
  { label: "Days Remaining",  column: "days_remaining"as const, align: "right" as const },
];

export default async function RenewalsDuePage({
  searchParams,
}: {
  searchParams: Promise<{ colSort?: string; colDir?: string }>;
}) {
  const sp = await searchParams;
  const profile = await requireUser(["admin", "manager", "reception"]);

  const [expiringMemberships, whatsappEnabled] = await Promise.all([
    getExpiringMemberships(profile.branch_id),
    hasCurrentFeature("whatsapp"),
  ]);
  const providerConfigured = isWhatsAppProviderConfigured();

  // Gym name for reminder messages — fallback to generic name
  const gymName = "SyncFyre Gym";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rows = expiringMemberships.map((sub) => {
    const endDate = new Date(sub.end_date);
    endDate.setHours(0, 0, 0, 0);
    const daysRemaining = differenceInDays(endDate, today);
    let badgeVariant: "default" | "warning" | "danger" = "default";
    if (daysRemaining <= 7) badgeVariant = "danger";
    else if (daysRemaining <= 15) badgeVariant = "warning";
    return { sub, endDate, daysRemaining, badgeVariant };
  });

  const { sort: colSort, dir: colDir } = readSort(
    sp as Record<string, string | undefined>,
    SORTABLE_COLUMNS.map((c) => c.column),
    { sort: "colSort", dir: "colDir" },
  );
  if (colSort) {
    const dirMul = colDir === "desc" ? -1 : 1;
    const sortValue = (row: (typeof rows)[number]): string | number => {
      switch (colSort) {
        case "member":        return row.sub.members?.full_name ?? "";
        case "plan":          return row.sub.membership_plans?.name ?? "Custom Plan";
        case "status":        return row.sub.status ?? "";
        case "amount":        return Number(row.sub.total_amount) || 0;
        case "start_date":    return row.sub.start_date ?? "";
        case "expiry_date":   return row.sub.end_date ?? "";
        case "days_remaining":return row.daysRemaining;
        default:              return "";
      }
    };
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dirMul;
      return ((av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0) * dirMul;
    });
  }

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
            Expiring Memberships ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <div className="mb-3 grid size-12 place-items-center rounded-full bg-muted">
                <AlertCircle className="size-6 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-foreground">No memberships expiring within 30 days</p>
              <p>All active member subscriptions are well within their validity period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {SORTABLE_COLUMNS.map(({ label, column, align }) => (
                      <SortableTh
                        key={column}
                        label={label}
                        column={column}
                        basePath="/admin/renewals"
                        searchParams={sp as Record<string, string | undefined>}
                        currentSort={colSort}
                        currentDir={colDir}
                        align={align}
                        paramNames={{ sort: "colSort", dir: "colDir" }}
                        className={`px-4 py-3 font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}
                      />
                    ))}
                    {whatsappEnabled && (
                      <th className="px-4 py-3 font-medium text-muted-foreground text-left">
                        Remind
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map(({ sub, endDate, daysRemaining, badgeVariant }) => {
                    const memberName = sub.members?.full_name ?? "Unknown";
                    const phone = sub.members?.phone ?? null;
                    const planName = sub.membership_plans?.name ?? "Custom Plan";
                    // Pre-bind the server action so we don't pass secrets to the client
                    const boundAction = sendRenewalReminderWhatsAppAction.bind(null, {
                      memberId: sub.member_id,
                      memberName,
                      phone: phone ?? "",
                      planName,
                      expiryDate: sub.end_date,
                      gymName,
                    });

                    return (
                      <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/members/${sub.member_id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {memberName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {sub.members?.member_code} • {phone ?? "No phone"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium">{planName}</td>
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
                        {whatsappEnabled && (
                          <td className="px-4 py-3">
                            <RenewalReminderButton
                              memberName={memberName}
                              phone={phone}
                              planName={planName}
                              expiryDate={sub.end_date}
                              gymName={gymName}
                              providerConfigured={providerConfigured}
                              sendAction={boundAction}
                            />
                          </td>
                        )}
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
