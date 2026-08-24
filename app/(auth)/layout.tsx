import { Suspense } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen bg-[#f4f7fb] lg:grid-cols-2">
    <section className="relative hidden overflow-hidden bg-[#071d38] p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-28 -top-28 size-80 rounded-full border-[56px] border-[#52c7ea]/10" />
      <div className="absolute bottom-16 right-20 h-64 w-10 skew-x-[-28deg] bg-primary/90" />
      <div className="relative w-fit rounded-2xl bg-white px-4 py-2"><Image src="/syncfyre-logo.png" width={180} height={86} alt="SyncFyre" className="h-14 w-auto object-contain" priority /></div>
      <div className="relative my-auto max-w-lg"><p className="mb-4 text-sm font-semibold uppercase tracking-[.25em] text-[#52c7ea]">Move better. Manage smarter.</p><h1 className="text-5xl font-bold leading-tight">Your entire gym operation, perfectly in sync.</h1><p className="mt-6 text-lg text-white/60">Members, subscriptions, attendance, trainers, payments, and insights in one secure workspace.</p></div>
      <p className="relative text-sm text-white/35">© 2026 SyncFyre · One intelligent platform.</p>
    </section>
    <section className="grid place-items-center p-5 sm:p-10"><Suspense>{children}</Suspense></section>
  </main>;
}
