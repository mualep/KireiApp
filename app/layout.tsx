import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "@/components/brand/offline-banner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KireiApp",
  description: "KireiApp foundation shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", "font-sans")}
      style={
        {
          "--font-sans": inter.style.fontFamily,
          "--font-mono": jetbrainsMono.style.fontFamily,
        } as CSSProperties
      }
    >
      <body className="min-h-screen antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
