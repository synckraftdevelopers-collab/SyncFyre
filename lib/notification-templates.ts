export type NotificationTemplate = {
  type: string;
  title: string;
  message: string;
  channels: string[];
  target_roles: string[];
  metadata: Record<string, unknown>;
};

function currency(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

export function buildBirthdayTemplate(input: { memberName: string; gymName: string }): NotificationTemplate {
  return {
    type: "birthday",
    title: `Happy birthday, ${input.memberName}`,
    message: `Send your best wishes to ${input.memberName} from ${input.gymName}.`,
    channels: ["email"],
    target_roles: ["owner", "admin", "manager", "reception"],
    metadata: { member_name: input.memberName, gym_name: input.gymName },
  };
}

export function buildMembershipExpiryTemplate(input: {
  memberName: string;
  gymName: string;
  expiryDate: string;
  remainingDays: number;
}): NotificationTemplate {
  return {
    type: "membership_expiry",
    title: `Membership expires in ${input.remainingDays} day${input.remainingDays === 1 ? "" : "s"}`,
    message: `${input.memberName}'s membership at ${input.gymName} expires on ${input.expiryDate}.`,
    channels: ["email"],
    target_roles: ["owner", "admin", "manager", "reception"],
    metadata: input,
  };
}

export function buildAppointmentTemplate(input: {
  memberName: string;
  gymName: string;
  appointmentAt: string;
  providerName?: string | null;
}): NotificationTemplate {
  return {
    type: "appointment_reminder",
    title: `Appointment reminder for ${input.memberName}`,
    message: `${input.memberName} has an appointment at ${input.gymName} on ${input.appointmentAt}${input.providerName ? ` with ${input.providerName}` : ""}.`,
    channels: ["email"],
    target_roles: ["owner", "admin", "manager", "reception", "trainer", "dietician"],
    metadata: input,
  };
}

export function buildPaymentTemplate(input: {
  memberName: string;
  gymName: string;
  amount: number;
  invoiceNumber?: string | null;
  dueDate?: string | null;
}): NotificationTemplate {
  return {
    type: "payment_pending",
    title: `Payment pending for ${input.memberName}`,
    message: `${input.memberName} has an outstanding balance of ${currency(input.amount)} at ${input.gymName}${input.invoiceNumber ? ` for invoice ${input.invoiceNumber}` : ""}.`,
    channels: ["email"],
    target_roles: ["owner", "admin", "manager", "reception"],
    metadata: input,
  };
}

