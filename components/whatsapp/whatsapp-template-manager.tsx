"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteCommunicationTemplateAction,
  saveCommunicationTemplateAction,
  type CustomizationActionState,
} from "@/app/actions/customization-actions";
import { getAllowedTemplateVariables, getSupportedTemplateKeys } from "@/lib/config/template-variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHANNELS = ["whatsapp", "sms", "email"] as const;
type Channel = (typeof CHANNELS)[number];

interface BranchOption {
  id: string;
  name: string;
}

export interface TemplateRow {
  id: string;
  branch_id: string | null;
  template_key: string;
  channel: string;
  name: string;
  content: string;
  variables: string[];
  is_active: boolean;
  branches?: { name?: string | null } | { name?: string | null }[] | null;
}

function branchLabel(row: TemplateRow, branches: BranchOption[]) {
  if (!row.branch_id) return "All branches";
  const joined = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  return joined?.name ?? branches.find((b) => b.id === row.branch_id)?.name ?? "Branch";
}

export function WhatsAppTemplateManager({
  templates,
  branches,
}: {
  templates: TemplateRow[];
  branches: BranchOption[];
}) {
  const [saveState, saveAction, savePending] = useActionState<CustomizationActionState, FormData>(saveCommunicationTemplateAction, {});
  const [deleteState, deleteAction] = useActionState<CustomizationActionState, FormData>(deleteCommunicationTemplateAction, {});

  const supportedKeys = getSupportedTemplateKeys();
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState<string>(supportedKeys[0] ?? "");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [content, setContent] = useState("");
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  const allowedVariables = getAllowedTemplateVariables(templateKey);

  function openCreate() {
    setEditing(null);
    setTemplateKey(supportedKeys[0] ?? "");
    setChannel("whatsapp");
    setContent("");
    setSelectedVariables([]);
    setFormOpen(true);
  }

  function openEdit(template: TemplateRow) {
    setEditing(template);
    setTemplateKey(template.template_key);
    setChannel(template.channel as Channel);
    setContent(template.content);
    setSelectedVariables(template.variables);
    setFormOpen(true);
  }

  // Close the form after a successful save (create or edit).
  useEffect(() => {
    if (saveState.success) setFormOpen(false);
  }, [saveState.success]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Message templates</h2>
          <p className="text-sm text-muted-foreground">
            Saved messages staff can pick from in the WhatsApp quick-send panel. Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{{variable}}"}</code> placeholders — they are
            filled in per-recipient when a message is sent.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-3.5" /> New template
        </Button>
      </div>

      {formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? `Edit "${editing.name}"` : "New template"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveAction} className="space-y-3">
              {editing ? <input type="hidden" name="template_id" value={editing.id} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Template key
                  <select
                    name="template_key"
                    value={templateKey}
                    onChange={(e) => {
                      setTemplateKey(e.target.value);
                      setSelectedVariables([]);
                    }}
                    disabled={Boolean(editing)}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm capitalize disabled:opacity-60"
                  >
                    {supportedKeys.map((key) => (
                      <option key={key} value={key} className="capitalize">
                        {key.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Channel
                  <select
                    name="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as Channel)}
                    disabled={Boolean(editing)}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm capitalize disabled:opacity-60"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c} className="capitalize">
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {branches.length ? (
                <label className="block text-sm font-medium">
                  Branch
                  <select
                    name="branch_id"
                    defaultValue={editing?.branch_id ?? ""}
                    disabled={Boolean(editing)}
                    className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Leave as &quot;All branches&quot; unless this template is specific to one location.
                  </span>
                </label>
              ) : null}

              <label className="block text-sm font-medium">
                Name
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editing?.name ?? ""}
                  className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm"
                />
              </label>

              <label className="block text-sm font-medium">
                Content
                <textarea
                  name="content"
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
                />
              </label>

              <div>
                <p className="text-sm font-medium">Variables used in this template</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {allowedVariables.map((variable) => {
                    const checked = selectedVariables.includes(variable);
                    return (
                      <label
                        key={variable}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          checked ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedVariables((prev) =>
                              e.target.checked ? [...prev, variable] : prev.filter((v) => v !== variable),
                            )
                          }
                        />
                        {`{{${variable}}}`}
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" name="variables" value={JSON.stringify(selectedVariables)} />
              </div>

              {saveState.error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveState.error}</p>
              ) : null}

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={savePending} className="gap-1.5">
                  {savePending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                  Save template
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={savePending}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {deleteState.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{deleteState.error}</p>
      ) : null}

      <div className="space-y-3">
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No templates yet. Create one above — staff can still send ad-hoc messages from the quick-send panel in
            the meantime.
          </p>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{template.name}</p>
                    <Badge variant="secondary" className="capitalize">{template.channel}</Badge>
                    <Badge variant="outline" className="capitalize">{template.template_key.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">{branchLabel(template, branches)}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{template.content}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(template)} className="gap-1.5">
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <form action={deleteAction}>
                    <input type="hidden" name="template_id" value={template.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
