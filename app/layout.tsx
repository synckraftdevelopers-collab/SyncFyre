import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { InstallSyncFyre } from "@/components/pwa/install-syncfyre";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SyncFyre", template: "%s | SyncFyre" },
  description: "One intelligent platform for every moving part of your gym",
  applicationName: "SyncFyre",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SyncFyre" },
  icons: { apple: "/icons/icon-192.png", icon: "/icons/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#071d38", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider>{children}<ServiceWorkerRegistration /><Toaster richColors position="top-right" /></ThemeProvider></body></html>;
}