import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { AuthSessionProvider } from "@/components/session-provider";
import "./globals.css";

export const dynamic = "force-dynamic";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Iyknel — Wholesale FMCG, delivered.",
  description: "Order fast-moving consumer goods for your business. Invoice, pay, dispatch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, serif.variable)} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
