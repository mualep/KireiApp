import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "@/components/brand/offline-banner";

export const metadata: Metadata = {
  title: "KireiApp",
  description: "KireiApp Enterprise Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("dark", "font-sans")}
      style={
        {
          "--font-sans": "Arial, Helvetica, sans-serif",
          "--font-heading": "'Helvetica Neue', Helvetica, Arial, sans-serif",
          "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        } as CSSProperties
      }
    >
      <body className="min-h-screen antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
