"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookDemoAction } from "./actions";

export function DemoBookingForm() {
  const [state, action, pending] = useActionState(bookDemoAction, {});
  if (state.success) return <div role="status" className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700">{state.success}<Link href="/login" className="mt-4 block font-medium underline">Return to sign in</Link></div>;

  return <form action={action} className="mt-7 space-y-4">
    <label className="block text-sm font-medium">Gym / Business Name<Input name="gymName" required className="mt-2" autoComplete="organization" /></label>
    <label className="block text-sm font-medium">Owner Name<Input name="ownerName" required className="mt-2" autoComplete="name" /></label>
    <label className="block text-sm font-medium">Email<Input name="email" type="email" required className="mt-2" autoComplete="email" /></label>
    <label className="block text-sm font-medium">Phone<Input name="phone" type="tel" required className="mt-2" autoComplete="tel" /></label>
    <label className="block text-sm font-medium">Number of Branches<Input name="branchCount" type="number" min="1" required className="mt-2" /></label>
    <label className="block text-sm font-medium">Message / Requirements <span className="font-normal text-muted-foreground">(optional)</span><textarea name="message" maxLength={1000} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></label>
    {state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{state.error}</p>}
    <Button className="h-11 w-full" disabled={pending}>{pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? "Submitting..." : "Request a Demo"}</Button>
  </form>;
}
