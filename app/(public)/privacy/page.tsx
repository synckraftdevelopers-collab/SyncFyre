import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 sm:py-16"><article className="mx-auto max-w-3xl"><Link href="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link><h1 className="mt-7 text-3xl font-bold">Privacy Policy</h1><p className="mt-5 text-sm font-medium text-amber-700">Draft for legal review</p><p className="mt-4 leading-7 text-muted-foreground">This draft policy describes how SyncFyre processes information needed to provide and secure its gym management platform. It will be replaced with approved legal wording before production release.</p><h2 className="mt-8 text-xl font-semibold">Information we process</h2><p className="mt-3 leading-7 text-muted-foreground">We process contact, account, and platform information supplied by authorized users and customer organizations to operate the service.</p><h2 className="mt-8 text-xl font-semibold">How information is used</h2><p className="mt-3 leading-7 text-muted-foreground">Information is used to provide the service, protect accounts, respond to support requests, and meet applicable legal obligations.</p></article></main>;
}
