"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical, LoaderCircle } from "lucide-react";
import { resetMemberFormConfigurationAction, saveMemberFormConfigurationAction, type MemberFormConfigActionState } from "@/app/actions/member-form-config-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberFormFieldConfiguration } from "@/lib/members/member-form-config";
import { toast } from "sonner";

export function MemberFormCustomizationPage({ initialConfiguration }: { initialConfiguration: MemberFormFieldConfiguration[] }) {
  const [items, setItems] = useState(initialConfiguration);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saveState, saveAction, savePending] = useActionState<MemberFormConfigActionState, FormData>(saveMemberFormConfigurationAction, {});
  const [resetState, resetAction, resetPending] = useActionState<MemberFormConfigActionState, FormData>(resetMemberFormConfigurationAction, {});

  useEffect(() => {
    setItems(initialConfiguration);
  }, [initialConfiguration]);

  useEffect(() => {
    if (saveState.success) {
      toast.success(saveState.success);
      window.location.reload();
    }
    if (saveState.error) toast.error(saveState.error);
  }, [saveState.error, saveState.success]);

  useEffect(() => {
    if (resetState.success) {
      toast.success(resetState.success);
      window.location.reload();
    }
    if (resetState.error) toast.error(resetState.error);
  }, [resetState.error, resetState.success]);

  function reorder(next: MemberFormFieldConfiguration[]) {
    setItems(next.map((item, index) => ({ ...item, displayOrder: index + 1, required: item.systemRequired ? true : item.enabled ? item.required : false })));
  }

  function moveItem(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const current = [...items];
    const from = current.findIndex((item) => item.key === dragKey);
    const to = current.findIndex((item) => item.key === targetKey);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    reorder(current);
    setDragKey(null);
  }

  function updateField(key: string, patch: Partial<MemberFormFieldConfiguration>) {
    reorder(items.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  const payload = JSON.stringify(items.map((item, index) => ({ key: item.key, enabled: item.systemRequired ? true : item.enabled, required: item.systemRequired ? true : item.enabled ? item.required : false, displayOrder: index + 1 })));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Customize Member Form</h1>
        <p className="text-sm text-muted-foreground">Choose which information your staff should collect when registering and editing members.</p>
        <p className="mt-1 text-sm text-muted-foreground">Changes apply only to this gym/organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Form Customization</CardTitle>
          <CardDescription>Drag fields to change display order. Hiding a field only removes it from the create and edit forms; it does not delete stored member data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveAction} className="space-y-4">
            <input type="hidden" name="config" value={payload} />
            <div className="max-h-[68vh] overflow-auto rounded-2xl border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Field</th>
                    <th className="px-4 py-3">Visible</th>
                    <th className="px-4 py-3">Required</th>
                    <th className="px-4 py-3 text-right">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, index) => (
                    <tr key={item.key} draggable onDragStart={() => setDragKey(item.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveItem(item.key)} className="bg-background">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button type="button" className="cursor-grab text-muted-foreground" aria-label={`Reorder ${item.label}`}>
                            <GripVertical className="size-4" />
                          </button>
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.section}</p>
                          </div>
                          {item.systemRequired ? <Badge variant="warning">System Required</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.systemRequired ? <Badge variant="success">Locked on</Badge> : <label className="inline-flex items-center gap-2"><input type="checkbox" checked={item.enabled} onChange={(event) => updateField(item.key, { enabled: event.target.checked, required: event.target.checked ? item.required : false })} /><span>{item.enabled ? "Shown" : "Hidden"}</span></label>}
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={item.required} disabled={!item.enabled || item.systemRequired} onChange={(event) => updateField(item.key, { required: event.target.checked })} />
                          <span>{item.required ? "Required" : "Optional"}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{index + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {saveState.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{saveState.error}</p> : null}
            {saveState.success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{saveState.success}</p> : null}
            {resetState.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{resetState.error}</p> : null}
            {resetState.success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{resetState.success}</p> : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Link href="/admin/members" className={buttonVariants({ variant: "outline" })}>Cancel</Link>
              <Button formAction={resetAction} type="submit" variant="outline" disabled={resetPending || savePending}>{resetPending ? "Resetting..." : "Reset to Default"}</Button>
              <Button type="submit" disabled={savePending || resetPending}>{savePending ? <><LoaderCircle className="size-4 animate-spin" />Saving...</> : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
