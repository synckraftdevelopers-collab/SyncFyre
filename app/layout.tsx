import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = { title: { default: "SyncFyre", template: "%s | SyncFyre" }, description: "One intelligent platform for every moving part of your gym" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider>{children}<Toaster richColors position="top-right" /></ThemeProvider></body></html>;
}
