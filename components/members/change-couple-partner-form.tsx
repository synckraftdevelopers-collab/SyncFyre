"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeCouplePartnerAction, type ChangePartnerState } from "@/app/actions/member-actions";

type MemberOption = { id: string; full_name: string; member_code: string };

/**
 * Inline panel for swapping who an already-sold couple plan is paired with.
 * Shown on the Edit Member page next to a couple-plan subscription that this
 * member was billed for (see member-edit-form.tsx). The old partner's linked
 * subscription is cancelled (kept in their history, not deleted); the new
 * partner gets a fresh, linked ₹0 subscription on the same plan/dates.
 */
export function ChangeCouplePartnerForm({
  subscriptionId,
  excludeMemberIds,
  members,
  onDone,
}: {
  subscriptionId: string;
  excludeMemberIds: string[];
  members: MemberOption[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const initialState: ChangePartnerState = {};
  const [state, action, pending] = useActionState(changeCouplePartnerAction, initialState);
  const [partnerMode, setPartnerMode] = useState<"existing" | "new">("existing");
  const [partnerMemberId, setPartnerMemberId] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success("Couple partner changed.");
      router.refresh();
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const excluded = new Set(excludeMemberIds);

  return (
    <form action={action} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <input type="hidden" name="partner_mode" value={partnerMode} />
      <p className="font-medium">Change couple partner</p>
      <p className="text-xs text-muted-foreground">
        The current partner&apos;s plan will be cancelled (kept in their history) and the new partner gets the same plan, start date, and expiry — billed on this member&apos;s invoice, same as before.
      </p>

      <div className="flex gap-4 text-xs font-medium">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={partnerMode === "existing"} onChange={() => setPartnerMode("existing")} />
          Existing member
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={partnerMode === "new"} onChange={() => setPartnerMode("new")} />
          New member (short form)
        </label>
      </div>

      {partnerMode === "existing" ? (
        <select
          name="partner_member_id"
          value={partnerMemberId}
          onChange={(event) => setPartnerMemberId(event.target.value)}
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          required
        >
          <option value="">Select the new second member</option>
          {members.filter((member) => !excluded.has(member.id)).map((member) => (
            <option key={member.id} value={member.id}>{member.full_name} ({member.member_code})</option>
          ))}
        </select>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium sm:col-span-1">
            Full name *
            <Input name="partner_full_name" placeholder="Second member's full name" required />
          </label>
          <label className="space-y-1 text-xs font-medium">
            Age
            <Input name="partner_age" type="number" min="0" max="130" placeholder="Optional" />
          </label>
          <label className="space-y-1 text-xs font-medium">
            Phone
            <Input name="partner_phone" placeholder="Optional" />
          </label>
        </div>
      )}

      {state.error && <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{state.error}</div>}

      <div className="flex justify-end gap-2">
        {onDone ? <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button> : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Save new partner
        </Button>
      </div>
    </form>
  );
}
