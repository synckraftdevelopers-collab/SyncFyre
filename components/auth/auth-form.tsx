"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallSyncTyre } from "@/components/pwa/install-syncfyre";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({
  action,
  mode,
}: {
  action: (state: AuthState, data: FormData) => Promise<AuthState>;
  mode: "login" | "forgot" | "reset";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(action, {});
  const accountConfigurationError = searchParams.get("error") === "account_not_configured";

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state.redirectTo, router]);

  const content = {
    login: ["Welcome back", "Sign in to manage your gym"],
    forgot: ["Forgot password?", "We'll email you a secure reset link"],
    reset: ["Create a new password", "Choose a strong password for your account"],
  }[mode];

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold">{content[0]}</h1>
      <p className="mt-2 text-muted-foreground">{content[1]}</p>

      <form action={formAction} className="mt-8 space-y-5">
        {mode !== "reset" && (
          <label className="block text-sm font-medium">
            Email address
            <Input
              name="email"
              type="email"
              autoComplete="email"
              className="mt-2"
              placeholder="you@gym.com"
              required
            />
          </label>
        )}

        {mode !== "forgot" && (
          <label className="block text-sm font-medium">
            Password
            <Input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-2"
              placeholder="********"
              required
            />
          </label>
        )}

        {(state.error || accountConfigurationError) && (
          <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            {state.error ?? "This account has not been assigned an active portal role. Please contact an administrator."}
          </p>
        )}

        {state.success && (
          <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
            {state.success}
          </p>
        )}

        {state.redirectTo && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Redirecting...
          </p>
        )}

        <Button className="w-full" disabled={pending || Boolean(state.redirectTo)}>
          {(pending || state.redirectTo) && <LoaderCircle className="size-4 animate-spin" />}
          {mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Update password"}
        </Button>

        {mode === "login" && <InstallSyncTyre />}

        <div className="text-center text-sm">
          {mode === "login" ? (
            <Link className="text-primary hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          ) : (
            <Link className="text-primary hover:underline" href="/login">
              Back to sign in
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
