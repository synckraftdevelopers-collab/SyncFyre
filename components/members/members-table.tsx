"use client";
import { useMemo } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { MoreHorizontal, UserRound } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { calculateAge, calculateBmi } from "@/lib/utils";
import type { Member } from "@/types";

const helper = createColumnHelper<Member>();
export function MembersTable({ data }: { data: Member[] }) {
  const columns = useMemo(() => [
    helper.accessor("full_name", { header: "Member", cell: ({ row }) => <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-muted"><UserRound className="size-4"/></div><div><p className="font-medium">{row.original.full_name}</p><p className="text-xs text-muted-foreground">{row.original.member_code}</p></div></div> }),
    helper.accessor("phone", { header: "Contact", cell: ({ row }) => <div><p>{row.original.phone}</p><p className="text-xs text-muted-foreground">{row.original.email ?? "—"}</p></div> }),
    helper.accessor("date_of_birth", { header: "Age", cell: ({ getValue }) => getValue() ? calculateAge(getValue()!) : "—" }),
    helper.display({ id: "bmi", header: "BMI", cell: ({ row }) => calculateBmi(row.original.height_cm, row.original.weight_kg) ?? "—" }),
    helper.accessor("fitness_goal", { header: "Fitness goal", cell: ({ getValue }) => <span className="line-clamp-1 max-w-40">{getValue() ?? "—"}</span> }),
    helper.accessor("status", { header: "Status", cell: ({ getValue }) => <Badge variant={getValue() === "active" ? "success" : "outline"}>{getValue()}</Badge> }),
    helper.display({ id: "actions", cell: ({row}) => <Link href={`/members/${row.original.id}`} className={buttonVariants({variant:"ghost",size:"icon"})} aria-label={`View ${row.original.full_name}`}><MoreHorizontal className="size-4"/></Link> }),
  ], []);
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  if (!data.length) return <div className="grid min-h-64 place-items-center text-center"><div><UserRound className="mx-auto mb-3 size-10 text-muted-foreground"/><p className="font-medium">No members found</p><p className="text-sm text-muted-foreground">Add your first member or adjust the filters.</p></div></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">{table.getHeaderGroups().map(g => <tr key={g.id}>{g.headers.map(h => <th key={h.id} className="px-4 py-3 font-medium">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody className="divide-y">{table.getRowModel().rows.map(row => <tr key={row.id} className="hover:bg-muted/30">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>;
}
