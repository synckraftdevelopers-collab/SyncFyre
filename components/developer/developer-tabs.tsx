"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/api-key-actions";
import {
  createWebhookAction,
  deleteWebhookAction,
  toggleWebhookActiveAction,
  WEBHOOK_EVENTS,
} from "@/app/actions/webhook-actions";

type ApiKeyRow = {
  id: string;
  name: string;
  branch_id: string | null;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type WebhookRow = {
  id: string;
  url: string;
  branch_id: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
};

type Branch = { id: string; name: string };

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function DeveloperTabs({
  apiKeys,
  webhooks,
  branches,
}: {
  apiKeys: ApiKeyRow[];
  webhooks: WebhookRow[];
  branches: Branch[];
}) {
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("keys")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "keys" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          API Keys
        </button>
        <button
          type="button"
          onClick={() => setTab("webhooks")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "webhooks" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Webhooks
        </button>
      </div>

      {tab === "keys" ? <ApiKeysTab apiKeys={apiKeys} branches={branches} /> : <WebhooksTab webhooks={webhooks} branches={branches} />}
    </div>
  );
}

function ApiKeysTab({ apiKeys, branches }: { apiKeys: ApiKeyRow[]; branches: Branch[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createApiKeyAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.plaintextKey) setRevealedSecret(result.plaintextKey);
      toast.success(result.success ?? "API key created.");
    });
  }

  function handleRevoke(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await revokeApiKeyAction(formData);
      if (result.error) setError(result.error);
      else toast.success(result.success ?? "API key revoked.");
    });
  }

  async function copySecret() {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure context) —
      // the secret is still shown in the box for manual copy either way.
    }
  }

  return (
    <div className="space-y-5">
      {revealedSecret ? (
        <div className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Your new API key</p>
          <p className="text-xs text-amber-800">
            Copy this secret now — for security, it will not be shown again. Only a display prefix is kept after
            you leave this page.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border bg-white px-3 py-2 text-xs">{revealedSecret}</code>
            <Button type="button" size="sm" variant="outline" onClick={copySecret}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="text-xs text-amber-800 underline hover:text-amber-950"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      ) : null}

      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">Create a new key</p>
          <form action={handleCreate} className="grid gap-2 sm:grid-cols-2">
            <Input name="name" placeholder="Key name (e.g. Zapier integration)" required disabled={isPending} />
            <select
              name="branch_id"
              disabled={isPending}
              defaultValue=""
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All branches (tenant-wide)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Input name="scopes" placeholder="Scopes, comma-separated (optional, e.g. members:read)" disabled={isPending} />
            <Input name="expires_at" type="date" disabled={isPending} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? "Creating..." : "Create key"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Scopes</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Last used</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expires</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {apiKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No API keys yet.
                </td>
              </tr>
            ) : (
              apiKeys.map((key) => (
                <tr key={key.id}>
                  <td className="px-3 py-2 font-medium">{key.name}</td>
                  <td className="px-3 py-2"><code className="text-xs">{key.key_prefix}…</code></td>
                  <td className="px-3 py-2">
                    {key.scopes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">full access</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(key.created_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(key.last_used_at)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(key.expires_at)}</td>
                  <td className="px-3 py-2">
                    {key.revoked_at ? (
                      <Badge variant="danger">Revoked</Badge>
                    ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                      <Badge variant="warning">Expired</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!key.revoked_at ? (
                      <form action={handleRevoke}>
                        <input type="hidden" name="key_id" value={key.id} />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="text-xs text-destructive underline hover:text-destructive/80"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WebhooksTab({ webhooks, branches }: { webhooks: WebhookRow[]; branches: Branch[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createWebhookAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.plaintextSecret) setRevealedSecret(result.plaintextSecret);
      toast.success(result.success ?? "Webhook created.");
    });
  }

  function handleToggle(webhookId: string, nextActive: boolean) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("webhook_id", webhookId);
      formData.set("is_active", String(nextActive));
      const result = await toggleWebhookActiveAction(formData);
      if (result.error) setError(result.error);
      else toast.success(result.success ?? "Webhook updated.");
    });
  }

  function handleDelete(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await deleteWebhookAction(formData);
      if (result.error) setError(result.error);
      else toast.success(result.success ?? "Webhook deleted.");
    });
  }

  return (
    <div className="space-y-5">
      {revealedSecret ? (
        <div className="space-y-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Webhook signing secret</p>
          <p className="text-xs text-amber-800">
            Use this to verify the X-SyncFyre-Signature header on incoming events. It will not be shown again.
          </p>
          <code className="block overflow-x-auto rounded-lg border bg-white px-3 py-2 text-xs">{revealedSecret}</code>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="text-xs text-amber-800 underline hover:text-amber-950"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      ) : null}

      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">Create a webhook endpoint</p>
          <form action={handleCreate} className="grid gap-2 sm:grid-cols-2">
            <Input name="url" type="url" placeholder="https://example.com/webhooks/syncfyre" required disabled={isPending} className="sm:col-span-2" />
            <select
              name="branch_id"
              disabled={isPending}
              defaultValue=""
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">All branches (tenant-wide)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex flex-wrap gap-3 rounded-lg border p-3">
              {WEBHOOK_EVENTS.map((evt) => (
                <label key={evt} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="events" value={evt} disabled={isPending} />
                  {evt}
                </label>
              ))}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? "Creating..." : "Create webhook"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">URL</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Events</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Active</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {webhooks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No webhook endpoints yet.
                </td>
              </tr>
            ) : (
              webhooks.map((wh) => (
                <tr key={wh.id}>
                  <td className="px-3 py-2 font-mono text-xs">{wh.url}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <Badge key={e} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(wh.created_at)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(wh.id, !wh.is_active)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        wh.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {wh.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <form action={handleDelete}>
                      <input type="hidden" name="webhook_id" value={wh.id} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="text-xs text-destructive underline hover:text-destructive/80"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
