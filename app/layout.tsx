import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
