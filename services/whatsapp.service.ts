/**
 * services/whatsapp.service.ts
 *
 * Data access for the ad-hoc WhatsApp quick-send flow (P2-R1):
 *   - communication_logs: append-only log of staff-initiated wa.me sends.
 *
 * Template CRUD/listing already lives in services/config.service.ts
 * (listCommunicationTemplates, getCommunicationTemplate) — reused as-is,
 * not duplicated here.
 */
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema";

export type CommunicationLogChannel = "whatsapp" | "sms";

export interface RecordCommunicationLogInput {
  tenantId: string;
  branchId?: string | null;
  memberId?: string | null;
  leadId?: string | null;
  channel: CommunicationLogChannel;
  /** null for a fully ad-hoc message with no saved template behind it */
  templateKey?: string | null;
  /** Short excerpt only — the full message is never stored. */
  messagePreview: string;
  recipientPhone?: string | null;
  sentBy: string;
}

/** Insert one communication_logs row. Fails soft if the table/migration isn't applied yet. */
export async function recordCommunicationLog(input: RecordCommunicationLogInput): Promise<void> {
  const supabase = await createClient();
  const preview = input.messagePreview.trim().slice(0, 200);
  const { error } = await supabase.from("communication_logs").insert({
    tenant_id: input.tenantId,
    branch_id: input.branchId ?? null,
    member_id: input.memberId ?? null,
    lead_id: input.leadId ?? null,
    channel: input.channel,
    template_key: input.templateKey ?? null,
    message_preview: preview,
    recipient_phone: input.recipientPhone ?? null,
    sent_by: input.sentBy,
  });
  if (error) {
    if (isMissingSchemaError(error)) return;
    throw new Error(error.message);
  }
}

export interface CommunicationLogRow {
  id: string;
  channel: string;
  template_key: string | null;
  message_preview: string;
  recipient_phone: string | null;
  created_at: string;
  member: { full_name: string } | null;
  lead: { full_name: string } | null;
  sentByUser: { full_name: string | null } | null;
}

export interface ListCommunicationLogsResult {
  rows: CommunicationLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Paginated, newest-first list of communication_logs for a tenant (optionally branch-scoped). */
export async function listCommunicationLogs(
  tenantId: string,
  branchId?: string | null,
  { page = 1, pageSize = 25 }: { page?: number; pageSize?: number } = {},
): Promise<ListCommunicationLogsResult> {
  const supabase = await createClient();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("communication_logs")
    .select(
      "id,channel,template_key,message_preview,recipient_phone,created_at,member:members(full_name),lead:leads(full_name),sentByUser:users!communication_logs_sent_by_fkey(full_name)",
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error, count } = await query;
  if (error) {
    if (isMissingSchemaError(error)) return { rows: [], total: 0, page: safePage, pageSize };
    throw new Error(error.message);
  }

  return { rows: (data ?? []) as unknown as CommunicationLogRow[], total: count ?? 0, page: safePage, pageSize };
}
