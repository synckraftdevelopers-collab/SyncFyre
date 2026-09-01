import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const OUTBOUND_CHANNELS = ["email", "sms", "whatsapp"] as const;
type OutboundChannel = (typeof OUTBOUND_CHANNELS)[number];

type NotificationRecord = {
  id: string;
  user_id: string | null;
  member_id: string | null;
  branch_id: string | null;
  tenant_id: string | null;
  type: string;
  title: string;
  message: string;
  channels: string[] | null;
  target_roles: string[] | null;
  metadata: Record<string, unknown> | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
};

type LogRecord = {
  channel: string;
  recipient: string | null;
  status: string;
};

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: { slug?: string } | { slug?: string }[] | null;
};

type Recipient = {
  userId: string | null;
  memberId: string | null;
  role: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type DeliveryResult = {
  provider?: string | null;
  providerMessageId?: string | null;
  status?: string | null;
};

function uniqueBy<T>(items: T[], keyOf: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length >= 10 ? `91${digits.slice(-10)}` : digits;
}

function endpointFor(channel: OutboundChannel) {
  if (channel === "email") return env.EMAIL_PROVIDER_URL;
  if (channel === "sms") return env.SMS_PROVIDER_URL;
  return env.WHATSAPP_PROVIDER_URL;
}

function apiKeyFor(channel: OutboundChannel) {
  if (channel === "email") return env.EMAIL_PROVIDER_API_KEY;
  if (channel === "sms") return env.SMS_PROVIDER_API_KEY;
  return env.WHATSAPP_PROVIDER_API_KEY;
}

function addressFor(channel: OutboundChannel, recipient: Recipient) {
  if (channel === "email") return recipient.email?.trim() || null;
  return normalizePhone(recipient.phone);
}

function extractRole(record: UserRecord) {
  const relation = record.role;
  if (Array.isArray(relation)) return relation[0]?.slug ?? null;
  return relation?.slug ?? null;
}

async function insertLog(input: {
  notificationId: string;
  channel: OutboundChannel;
  recipient: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  status: "queued" | "sent" | "delivered" | "failed" | "skipped";
  errorMessage?: string | null;
  deliveredAt?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("notification_logs").insert({
    notification_id: input.notificationId,
    channel: input.channel,
    recipient: input.recipient,
    provider: input.provider ?? null,
    provider_message_id: input.providerMessageId ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
    delivered_at: input.deliveredAt ?? null,
  });
  if (error) throw new Error(error.message);
}

async function resolveRecipients(notification: NotificationRecord) {
  const admin = createAdminClient();
  const recipients: Recipient[] = [];
  const targetRoles = notification.target_roles ?? [];

  if (notification.user_id) {
    const { data: user, error } = await admin
      .from("users")
      .select("id, full_name, email, phone, role:roles(slug)")
      .eq("id", notification.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (user) {
      const record = user as unknown as UserRecord;
      recipients.push({
        userId: record.id,
        memberId: notification.member_id,
        role: extractRole(record),
        name: record.full_name ?? null,
        email: record.email ?? null,
        phone: record.phone ?? null,
      });
    }
  }

  if (notification.member_id) {
    const { data: member, error } = await admin
      .from("members")
      .select("id, user_id, full_name, email, phone")
      .eq("id", notification.member_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (member) {
      recipients.push({
        userId: member.user_id ?? notification.user_id,
        memberId: member.id,
        role: "member",
        name: member.full_name ?? null,
        email: member.email ?? null,
        phone: member.phone ?? null,
      });
    }
  }

  const roleTargets = targetRoles.filter((role) => role !== "member");
  if (roleTargets.length > 0) {
    let query = admin.from("users").select("id, full_name, email, phone, role:roles!inner(slug)");
    if (notification.tenant_id) query = query.eq("tenant_id", notification.tenant_id);
    else query = query.is("tenant_id", null);
    if (notification.branch_id) query = query.eq("branch_id", notification.branch_id);

    const { data: users, error } = await query;
    if (error) throw new Error(error.message);
    for (const user of (users ?? []) as unknown as UserRecord[]) {
      const role = extractRole(user);
      if (!role || !roleTargets.includes(role)) continue;
      recipients.push({
        userId: user.id,
        memberId: null,
        role,
        name: user.full_name ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
      });
    }
  }

  return uniqueBy(recipients, (recipient) => `${recipient.userId ?? "anon"}|${recipient.memberId ?? "none"}|${recipient.email ?? ""}|${recipient.phone ?? ""}|${recipient.role ?? ""}`);
}

async function sendViaWebhook(channel: OutboundChannel, recipient: string, notification: NotificationRecord, profile: Recipient) {
  const endpoint = endpointFor(channel);
  const apiKey = apiKeyFor(channel);

  if (!endpoint) throw new Error(`${channel.toUpperCase()} provider URL is not configured`);
  if (!apiKey) throw new Error(`${channel.toUpperCase()} provider API key is not configured`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      notificationId: notification.id,
      channel,
      recipient,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      tenantId: notification.tenant_id,
      branchId: notification.branch_id,
      userId: profile.userId,
      memberId: profile.memberId,
      recipientName: profile.name,
      metadata: notification.metadata ?? {},
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  });

  let payload: DeliveryResult | null = null;
  try {
    payload = (await response.json()) as DeliveryResult;
  } catch {}

  if (!response.ok) {
    const detail = payload?.status || response.statusText || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return {
    provider: payload?.provider ?? endpoint,
    providerMessageId: payload?.providerMessageId ?? null,
    status: payload?.status ?? "sent",
  } as DeliveryResult;
}

async function processNotification(notification: NotificationRecord) {
  const admin = createAdminClient();
  const outboundChannels = (notification.channels ?? []).filter((channel): channel is OutboundChannel =>
    (OUTBOUND_CHANNELS as readonly string[]).includes(channel),
  );
  if (outboundChannels.length === 0) return { processed: 0, sent: 0, failed: 0, skipped: 0 };

  const { data: existingLogs, error: logsError } = await admin
    .from("notification_logs")
    .select("channel, recipient, status")
    .eq("notification_id", notification.id)
    .in("channel", outboundChannels);
  if (logsError) throw new Error(logsError.message);

  const existing = new Set(
    ((existingLogs ?? []) as LogRecord[])
      .filter((log) => log.status === "sent" || log.status === "delivered")
      .map((log) => `${log.channel}|${log.recipient ?? ""}`),
  );

  const recipients = await resolveRecipients(notification);
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const channel of outboundChannels) {
    const channelRecipients = uniqueBy(
      recipients
        .map((profile) => ({ profile, recipient: addressFor(channel, profile) }))
        .filter((item): item is { profile: Recipient; recipient: string } => Boolean(item.recipient)),
      (item) => item.recipient,
    );

    if (channelRecipients.length === 0) {
      await insertLog({
        notificationId: notification.id,
        channel,
        recipient: null,
        status: "skipped",
        errorMessage: `No ${channel} recipient available for this notification.`,
      });
      processed += 1;
      skipped += 1;
      continue;
    }

    for (const item of channelRecipients) {
      const dedupeKey = `${channel}|${item.recipient}`;
      if (existing.has(dedupeKey)) continue;
      processed += 1;
      try {
        const result = await sendViaWebhook(channel, item.recipient, notification, item.profile);
        await insertLog({
          notificationId: notification.id,
          channel,
          recipient: item.recipient,
          provider: result.provider ?? null,
          providerMessageId: result.providerMessageId ?? null,
          status: result.status === "delivered" ? "delivered" : "sent",
          deliveredAt: result.status === "delivered" ? new Date().toISOString() : null,
        });
        sent += 1;
      } catch (error) {
        await insertLog({
          notificationId: notification.id,
          channel,
          recipient: item.recipient,
          provider: endpointFor(channel),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : `Unable to send ${channel} notification.`,
        });
        failed += 1;
      }
    }
  }

  if (failed === 0) {
    const { error: updateError } = await admin.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", notification.id);
    if (updateError) throw new Error(updateError.message);
  }

  return { processed, sent, failed, skipped };
}

export async function dispatchPendingNotificationDeliveries(limit = 50) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("notifications")
    .select("id, user_id, member_id, branch_id, tenant_id, type, title, message, channels, target_roles, metadata, scheduled_for, sent_at, created_at")
    .is("sent_at", null)
    .lte("scheduled_for", now)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const notifications = ((data ?? []) as NotificationRecord[]).filter((notification) =>
    (notification.channels ?? []).some((channel) => (OUTBOUND_CHANNELS as readonly string[]).includes(channel)),
  );

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const notification of notifications) {
    const result = await processNotification(notification);
    processed += result.processed;
    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;
  }

  return { queued: notifications.length, processed, sent, failed, skipped };
}
