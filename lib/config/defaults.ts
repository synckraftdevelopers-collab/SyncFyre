import type { ConfigValueMap, FeatureKey } from "@/lib/config/schema";

export const CONFIG_DEFAULTS: ConfigValueMap = {
  "branding.logo_url": null,
  "branding.favicon_url": null,
  "branding.primary_color": "#ff3024",
  "branding.secondary_color": "#071d38",
  "branding.accent_color": "#52c7ea",
  "branding.theme": "light",
  "branding.login_title": null,
  "branding.member_portal_title": null,
  "payments.visible_modes": [],
  "payments.allow_partial_payments": true,
  "payments.require_approval": false,
  "notifications.membership_expiry.enabled": true,
  "notifications.membership_expiry.channels": [],
  "notifications.payment_pending.enabled": true,
  "notifications.payment_pending.channels": [],
  "notifications.payment_received.enabled": true,
  "notifications.payment_received.channels": [],
  "notifications.daily_closing.enabled": true,
  "notifications.daily_closing.channels": [],
};

export const FEATURE_DEFAULTS: Record<FeatureKey, boolean> = {
  customization_engine_enabled: false,
  members: true,
  membership: true,
  payments: true,
  finance: true,
  accounting: true,
  gst: true,
  trainer: true,
  dietician: true,
  equipment: true,
  biometric: true,
  whatsapp: true,
  reports: true,
  advanced_reports: true,
  member_portal: true,
  ai_insights: false,
};

export const COMMUNICATION_TEMPLATE_DEFAULTS = {
  membership_expiry: {
    whatsapp: {
      name: "Membership Expiry Reminder",
      content: "Hello {{member_name}}, your {{membership_plan}} expires on {{expiry_date}}. Please renew with {{gym_name}}.",
      variables: ["member_name", "membership_plan", "expiry_date", "gym_name"],
    },
    sms: {
      name: "Membership Expiry SMS",
      content: "Hi {{member_name}}, your {{membership_plan}} expires on {{expiry_date}}. - {{gym_name}}",
      variables: ["member_name", "membership_plan", "expiry_date", "gym_name"],
    },
    email: {
      name: "Membership Expiry Email",
      content: "Hello {{member_name}},\n\nYour {{membership_plan}} will expire on {{expiry_date}}.\nPlease renew your membership.\n\n{{gym_name}}",
      variables: ["member_name", "membership_plan", "expiry_date", "gym_name"],
    },
  },
  payment_pending: {
    whatsapp: {
      name: "Pending Payment Reminder",
      content: "Hello {{member_name}}, your pending amount is {{pending_amount}} for {{gym_name}}.",
      variables: ["member_name", "pending_amount", "gym_name"],
    },
    sms: {
      name: "Pending Payment SMS",
      content: "Hi {{member_name}}, pending payment: {{pending_amount}}. - {{gym_name}}",
      variables: ["member_name", "pending_amount", "gym_name"],
    },
    email: {
      name: "Pending Payment Email",
      content: "Hello {{member_name}},\n\nYour pending payment is {{pending_amount}}.\n\n{{gym_name}}",
      variables: ["member_name", "pending_amount", "gym_name"],
    },
  },
} as const;
