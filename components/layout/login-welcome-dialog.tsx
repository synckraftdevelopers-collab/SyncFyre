"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  if (hour < 21) return "Good Evening!";
  return "Good Night!";
}

export function LoginWelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState("Good Morning!");

  useEffect(() => {
    if (!document.cookie.includes("syncfyre_login_welcome=1")) return;
    document.cookie = "syncfyre_login_welcome=; Max-Age=0; Path=/; SameSite=Lax";
    setGreeting(greetingForNow());
    setOpen(true);
  }, []);

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl focus:outline-none sm:p-8">
        <Dialog.Title className="text-2xl font-semibold tracking-tight text-[#071d38] dark:text-foreground">{greeting}</Dialog.Title>
        <Dialog.Description className="mt-4 text-sm leading-6 text-muted-foreground">Welcome to SyncFyre.<br />Here&apos;s what&apos;s happening in your gym today.</Dialog.Description>
        <div className="mt-7 flex justify-end"><Dialog.Close asChild><Button>Continue</Button></Dialog.Close></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}