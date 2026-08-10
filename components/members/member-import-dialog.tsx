"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { importMembersAction } from "@/app/actions/member-import-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Branch = { id: string; name: string };

const template = [
  "full_name,phone,email,gender,date_of_birth,address,emergency_contact_name,emergency_contact_phone,height_cm,weight_kg,blood_group,medical_conditions,fitness_goal,status",
  "Aarav Sharma,9876543210,aarav@example.com,male,1995-08-15,,,,175,72,O+,,Weight loss,active",
].join("\n");

export function MemberImportDialog({ branches, defaultBranchId }: { branches: Branch[]; defaultBranchId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importMembersAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.imported !== undefined) {
      toast.success(`${state.imported} member${state.imported === 1 ? "" : "s"} imported.`);
      if (state.imported > 0) formRef.current?.reset();
    }
  }, [state]);

  function downloadTemplate() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    link.download = "member-import-template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Upload className="size-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" />Import members from Excel</DialogTitle>
          <DialogDescription>Upload an .xlsx, .xls, or .csv sheet. Each valid row creates one member in the selected branch.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
            <p className="font-medium">Required columns: Full Name and Phone</p>
            <p className="mt-1 text-muted-foreground">Optional: Email, Gender, Date of Birth, Address, Height, Weight, Blood Group, Medical Conditions, Fitness Goal, Status. Blank optional cells are allowed and will stay empty.</p>
            <button type="button" onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Download className="size-4" /> Download template
            </button>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Branch *
            <select name="branch_id" required defaultValue={defaultBranchId ?? ""} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Member spreadsheet *
            <input name="file" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" required className="block w-full rounded-lg border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary" />
          </label>
          <p className="text-xs text-muted-foreground">Maximum 10,000 rows and 10 MB per import. Existing phone numbers in the selected branch are skipped.</p>
          {state.imported !== undefined && <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700">Imported {state.imported} member{state.imported === 1 ? "" : "s"}; skipped {state.skipped ?? 0}.</div>}
          {state.errors?.length ? <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800"><p className="font-medium">Import discrepancies</p><ul className="mt-1 list-inside list-disc">{state.errors.map((error) => <li key={error}>{error}</li>)}</ul>{(state.skipped ?? 0) > state.errors.length && <p className="mt-1">Additional invalid rows were skipped.</p>}</div> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}Import members</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}