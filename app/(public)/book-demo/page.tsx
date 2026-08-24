import Image from "next/image";
import Link from "next/link";
import { DemoBookingForm } from "./demo-booking-form";

export const metadata = { title: "Book a Demo" };

export default function BookDemoPage() {
  return <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 sm:py-16"><section className="mx-auto max-w-xl"><Link href="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link><Image src="/syncfyre-logo.png" width={160} height={76} alt="SyncFyre" className="mt-7 h-12 w-auto object-contain" priority /><h1 className="mt-7 text-3xl font-bold">Book a Demo</h1><p className="mt-2 text-muted-foreground">Tell us about your gym and our team will be in touch.</p><DemoBookingForm /></section></main>;
}
