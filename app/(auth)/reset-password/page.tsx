import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "../actions";

function ResetPasswordFallback() {
  return <div className="w-full max-w-md animate-pulse rounded-lg border bg-muted/30 p-6" aria-label="Loading password reset form" />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <AuthForm action={resetPasswordAction} mode="reset" />
    </Suspense>
  );
}