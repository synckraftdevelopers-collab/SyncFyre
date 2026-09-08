export function calculateMembershipPlanTotals(input: {
  price: number;
  discountPercent?: number | null;
  gstPercent?: number | null;
  discountAmount?: number | null;
}) {
  const price = Number(input.price) || 0;
  const suggestedDiscount = Math.round(((price * Number(input.discountPercent ?? 0)) / 100) * 100) / 100;
  const discountAmount = Number(input.discountAmount ?? suggestedDiscount) || 0;
  const taxableAmount = Math.max(0, price - discountAmount);
  const gstAmount = Math.round((taxableAmount * Number(input.gstPercent ?? 0) / 100) * 100) / 100;
  const totalAmount = Math.max(0, taxableAmount + gstAmount);
  return { price, discountAmount, taxableAmount, gstAmount, totalAmount };
}