"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({ action, mode }: { action: (state: AuthState, data: FormData) => Promise<AuthState>; mode: "login" | "forgot" | "reset" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(action, {});
  const accountConfigurationError = searchParams.get("error") === "account_not_configured";

  useEffect(() => {
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state.redirectTo, router]);

  const content = {
    login: ["Welcome back", "Sign in to your account"],
    forgot: ["Forgot password?", "We'll email you a secure reset link"],
    reset: ["Create a new password", "Choose a strong password for your account"],
    register: ["Create Your Gym / Business Account", "Start your 1-year free trial. No payment required."],
  }[mode];

  return <div className="w-full max-w-md">
    {(mode === "login" || mode === "register") && <div className="mb-9"><Image src="/syncfyre-login-logo-transparent.png" width={220} height={110} alt="Syncfyre" className="h-auto w-44 sm:w-52" priority /></div>}
    <h1 className="text-2xl font-semibold tracking-tight text-[#071d38]">{content[0]}</h1><p className="mt-1.5 text-sm text-muted-foreground">{content[1]}</p>
    <form action={formAction} className="mt-7 space-y-5">
      {mode === "register" && <label className="block text-sm font-medium">Full name<Input name="full_name" autoComplete="name" className="mt-2" placeholder="Your full name" required /></label>}
      {(mode === "login" || mode === "forgot" || mode === "register") && <label className="block text-sm font-medium">Email address<Input name="email" type="email" autoComplete="email" className="mt-2" placeholder="name@example.com" required /></label>}
      {mode === "register" && <label className="block text-sm font-medium">Mobile number (optional)<Input name="phone" type="tel" autoComplete="tel" className="mt-2" placeholder="+91 9876543210" /></label>}
      {(mode === "login" || mode === "reset" || mode === "register") && <label className="block text-sm font-medium">Password<Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2" placeholder={mode === "login" ? "Enter your password" : "Create a password"} required /></label>}
      {mode === "register" && <label className="block text-sm font-medium">Confirm password<Input name="confirm_password" type="password" autoComplete="new-password" className="mt-2" placeholder="Confirm your password" required /></label>}
      {(state.error || accountConfigurationError) && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error ?? "This account has not been assigned an active portal role. Please contact an administrator."}</p>}
      {state.success && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{state.success}</p>}
      {state.redirectTo && <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Redirecting...</p>}
      {mode === "login" && <Link className="block text-sm font-medium text-primary hover:underline" href="/forgot-password">Forgot password?</Link>}
      <Button className="h-11 w-full" disabled={pending || Boolean(state.redirectTo)}>{(pending || state.redirectTo) && <LoaderCircle className="size-4 animate-spin" />}{mode === "login" ? "Sign In" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Create account"}</Button>
      {mode === "login" && <div className="pt-3 text-center text-sm"><p className="text-muted-foreground">Don&apos;t have an account?</p><Link href="/register" className="mt-2 inline-block font-semibold text-primary hover:underline">Start your free trial</Link></div>}
      {mode === "register" && <div className="pt-3 text-center text-sm"><p className="text-muted-foreground">Already have an account?</p><Link href="/login" className="mt-2 inline-block font-semibold text-primary hover:underline">Sign in</Link></div>}
      {mode === "login" && <section aria-label="Legal agreements" className="mx-auto max-w-sm px-2 pt-4 text-center text-xs leading-5 text-muted-foreground">
        <p>
          By continuing, you agree to our{" "}
          <Link href="https://syncfyre.com/terms-and-conditions" className="rounded-sm font-medium text-[#173a63] underline decoration-[#173a63]/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Terms &amp; Conditions</Link>{" "}
          and{" "}
          <Link href="https://syncfyre.com/privacy-policy" className="rounded-sm font-medium text-[#173a63] underline decoration-[#173a63]/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Privacy Policy</Link>.
        </p>
        <p className="mt-2">
          <Link href="https://syncfyre.com/disclaimer" className="rounded-sm font-medium text-[#173a63] underline decoration-[#173a63]/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Disclaimer</Link>{" "}
          <span aria-hidden="true" className="px-1 text-muted-foreground/80">·</span>{" "}
          <Link href="https://syncfyre.com/cancellation-and-refund-policy" className="rounded-sm font-medium text-[#173a63] underline decoration-[#173a63]/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Cancellation &amp; Refund Policy</Link>
        </p>
      </section>}
      {(mode === "forgot" || mode === "reset") && <div className="text-center text-sm"><Link className="text-primary hover:underline" href="/login">Back to sign in</Link></div>}
    </form>
  </div>;
}
