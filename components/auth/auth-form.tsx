"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({ action, mode }: { action: (state: AuthState, data: FormData) => Promise<AuthState>; mode: "login" | "forgot" | "reset" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(action, {});
  const accountConfigurationError = searchParams.get("error") === "account_not_configured";

  useEffect(() => { if (state.redirectTo) router.push(state.redirectTo); }, [state.redirectTo, router]);

  const content = { login: ["Welcome back", "Sign in to your account"], forgot: ["Forgot password?", "We'll email you a secure reset link"], reset: ["Create a new password", "Choose a strong password for your account"] }[mode];

  return <div className="w-full max-w-sm">
    {mode === "login" && <div className="mb-9"><Image src="/syncfyre-login-logo-transparent.png" width={220} height={110} alt="Syncfyre" className="h-auto w-44 sm:w-52" priority /></div>}
    <h1 className="text-2xl font-semibold tracking-tight text-[#071d38]">{content[0]}</h1><p className="mt-1.5 text-sm text-muted-foreground">{content[1]}</p>
    <form action={formAction} className="mt-7 space-y-5">
      {mode !== "reset" && <label className="block text-sm font-medium">Email address<Input name="email" type="email" autoComplete="email" className="mt-2" placeholder="name@example.com" required /></label>}
      {mode !== "forgot" && <label className="block text-sm font-medium">Password<Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2" placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢" required /></label>}
      {(state.error || accountConfigurationError) && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error ?? "This account has not been assigned an active portal role. Please contact an administrator."}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{state.success}</p>}
      {state.redirectTo && <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Redirecting...</p>}
      {mode === "login" && <Link className="block text-sm font-medium text-primary hover:underline" href="/forgot-password">Forgot password?</Link>}
      <Button className="h-11 w-full" disabled={pending || Boolean(state.redirectTo)}>{(pending || state.redirectTo) && <LoaderCircle className="size-4 animate-spin" />}{mode === "login" ? "Sign In" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
      {mode === "login" && <><div className="pt-3 text-center text-sm"><p className="text-muted-foreground">Don&apos;t have an account?</p><Link href="/book-demo" className="mt-2 inline-block font-semibold text-primary hover:underline">Book a Demo</Link></div><p className="pt-2 text-center text-xs leading-5 text-muted-foreground">By signing in, you agree to our<br /><Link href="/terms" className="font-medium text-foreground hover:underline">Terms</Link>{" "}and{" "}<Link href="/privacy" className="font-medium text-foreground hover:underline">Privacy</Link>.</p></>}
      {mode !== "login" && <div className="text-center text-sm"><Link className="text-primary hover:underline" href="/login">Back to sign in</Link></div>}
    </form>
  </div>;
}
