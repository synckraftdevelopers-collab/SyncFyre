import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-background p-6"><section className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><WifiOff className="size-7" /></div><h1 className="mt-5 text-xl font-bold">YouÃ¢â‚¬â„¢re offline</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">SyncTyre could not load this page without a connection. Previously opened safe views may still be available from your browser history.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</Link></section></main>;
}