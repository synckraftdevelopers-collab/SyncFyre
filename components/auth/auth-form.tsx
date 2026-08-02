"use client";
import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({ action, mode }: { action: (state: AuthState, data: FormData) => Promise<AuthState>; mode: "login" | "forgot" | "reset" }) {
  const [state, formAction, pending] = useActionState(action, {});
  const content = {
    login: ["Welcome back", "Sign in to manage your gym"],
    forgot: ["Forgot password?", "We’ll email you a secure reset link"],
    reset: ["Create a new password", "Choose a strong password for your account"],
  }[mode];
  return <div className="w-full max-w-md"><h1 className="text-3xl font-bold">{content[0]}</h1><p className="mt-2 text-muted-foreground">{content[1]}</p><form action={formAction} className="mt-8 space-y-5">
    {mode !== "reset" && <label className="block text-sm font-medium">Email address<Input name="email" type="email" autoComplete="email" className="mt-2" placeholder="you@gym.com" required /></label>}
    {mode !== "forgot" && <label className="block text-sm font-medium">Password<Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2" placeholder="••••••••" required /></label>}
    {state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error}</p>}
    {state.success && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">{state.success}</p>}
    <Button className="w-full" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin"/>}{mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
    <div className="text-center text-sm">{mode === "login" ? <Link className="text-primary hover:underline" href="/forgot-password">Forgot password?</Link> : <Link className="text-primary hover:underline" href="/login">Back to sign in</Link>}</div>
  </form></div>;
}
