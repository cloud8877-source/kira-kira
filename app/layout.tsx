import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Kira-Kira",
  description: "Bayar sama-sama, tanpa segan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-MY" className={cn(fraunces.variable, inter.variable, mono.variable, "font-sans")}>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
