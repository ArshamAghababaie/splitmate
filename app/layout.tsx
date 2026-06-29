import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";

import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitMate",
  description: "Expense splitting and debt tracking for friends",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SplitMate",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFD600",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-body">
        <ServiceWorkerRegistrar />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
