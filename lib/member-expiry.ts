export const EXPIRY_QUICK_FILTERS = [
  { days: 0, label: "Today" },
  { days: 2, label: "Within 2 days" },
  { days: 8, label: "Within 8 days" },
  { days: 15, label: "Within 15 days" },
  { days: 60, label: "Within 60 days" },
  { days: 365, label: "Within 1 year" },
] as const;
