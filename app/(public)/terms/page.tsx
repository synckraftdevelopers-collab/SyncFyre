import Link from "next/link";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 sm:py-16"><article className="mx-auto max-w-3xl"><Link href="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link><h1 className="mt-7 text-3xl font-bold">Terms of Service</h1><p className="mt-5 text-sm font-medium text-amber-700">Draft for legal review</p><p className="mt-4 leading-7 text-muted-foreground">These draft terms govern access to and use of the SyncFyre gym management platform. They will be replaced with approved legal terms before production release.</p><h2 className="mt-8 text-xl font-semibold">Account use</h2><p className="mt-3 leading-7 text-muted-foreground">Authorized users must keep their account credentials confidential and use the platform only for legitimate business purposes.</p><h2 className="mt-8 text-xl font-semibold">Platform access</h2><p className="mt-3 leading-7 text-muted-foreground">Your organization is responsible for managing access to its account. Contact SyncFyre support if you suspect unauthorized access.</p></article></main>;
}
