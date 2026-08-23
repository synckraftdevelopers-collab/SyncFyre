"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallSyncTyre({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as DeferredInstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setShowHelp(false); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return null;
  const install = async () => {
    if (!prompt) { setShowHelp((current) => !current); return; }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };
  return <div className={cn("space-y-2", className)}><Button type="button" variant="outline" className="min-h-11 w-full gap-2" onClick={install}><Download className="size-4" />Install SyncTyre</Button>{showHelp && <p className="rounded-xl bg-muted p-3 text-left text-xs leading-5 text-muted-foreground">{isIos ? <><Share className="mr-1 inline size-3.5" />In Safari, tap Share, then choose <strong>Add to Home Screen</strong>.</> : <>Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. The native install prompt appears after the browser has verified this site.</>}</p>}</div>;
}