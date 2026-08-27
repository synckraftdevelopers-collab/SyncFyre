"use client";

import { useActionState } from "react";
import { LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { updateOwnEmailAction, updateOwnPasswordAction, type AccountSettingsState } from "@/app/actions/account-settings-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState: AccountSettingsState = {};
const fieldClass = "space-y-1.5 text-sm font-medium";

function Feedback({ state }: { state: AccountSettingsState }) {
  if (state.error) {
    return <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error}</p>;
  }
  if (state.success) {
    return <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{state.success}</p>;
  }
  return null;
}

export function AccountSecurityCard({ email }: { email: string | null }) {
  const [emailState, emailAction] = useActionState(updateOwnEmailAction, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(updateOwnPasswordAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Security</CardTitle>
        <p className="text-sm text-muted-foreground">
          Update the login email and password for this account. Current password verification is required before either change is applied.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-muted p-2"><Mail className="size-4" /></div>
            <div>
              <h3 className="font-semibold">Change Email</h3>
              <p className="text-sm text-muted-foreground">
                Current email: <span className="font-medium text-foreground">{email ?? "Not configured"}</span>
              </p>
            </div>
          </div>
          <form action={emailAction} className="grid gap-4 md:grid-cols-2">
            <label className={fieldClass}>
              Current password
              <Input name="current_password" type="password" autoComplete="current-password" required />
              {emailState.fieldErrors?.current_password ? <span className="text-xs text-red-600">{emailState.fieldErrors.current_password}</span> : null}
            </label>
            <label className={fieldClass}>
              New email
              <Input name="new_email" type="email" autoComplete="email" required />
              {emailState.fieldErrors?.new_email ? <span className="text-xs text-red-600">{emailState.fieldErrors.new_email}</span> : null}
            </label>
            <div className="md:col-span-2">
              <Feedback state={emailState} />
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-muted p-2"><ShieldCheck className="size-4" /></div>
            <div>
              <h3 className="font-semibold">Change Password</h3>
              <p className="text-sm text-muted-foreground">
                Use a strong password with at least 8 characters, one uppercase letter, and one number.
              </p>
            </div>
          </div>
          <form action={passwordAction} className="grid gap-4 md:grid-cols-2">
            <label className={fieldClass}>
              Current password
              <Input name="current_password" type="password" autoComplete="current-password" required />
              {passwordState.fieldErrors?.current_password ? <span className="text-xs text-red-600">{passwordState.fieldErrors.current_password}</span> : null}
            </label>
            <label className={fieldClass}>
              New password
              <Input name="new_password" type="password" autoComplete="new-password" required />
              {passwordState.fieldErrors?.new_password ? <span className="text-xs text-red-600">{passwordState.fieldErrors.new_password}</span> : null}
            </label>
            <label className={`${fieldClass} md:col-span-2`}>
              Confirm password
              <Input name="confirm_password" type="password" autoComplete="new-password" required />
              {passwordState.fieldErrors?.confirm_password ? <span className="text-xs text-red-600">{passwordState.fieldErrors.confirm_password}</span> : null}
            </label>
            <div className="md:col-span-2">
              <Feedback state={passwordState} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button disabled={passwordPending}>
                {passwordPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Update password
              </Button>
            </div>
          </form>
        </section>
      </CardContent>
    </Card>
  );
}
