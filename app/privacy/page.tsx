import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy | KireiApp",
  description: "Privacy Policy and Data Protection practices of Kireiku.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between border-b border-border/60 pb-6">
          <Link
            href="/"
            className="text-xl font-black tracking-tight hover:opacity-80 transition-opacity"
            translate="no"
          >
            Kireiku<span className="text-primary">.</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/" className="flex items-center gap-1.5">
              <ChevronLeft className="size-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none flex flex-col gap-6 text-foreground/90">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
              Privacy Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: August 21, 2026
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              1. Information We Collect
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We collect information provided directly when you interact with our platform, such as profile names, verified email addresses, service order logs, and internal work performance metrics (such as attendance and task submissions for staff and workers).
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              2. How We Use Information
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The information we collect is utilized strictly to:
            </p>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1.5">
              <li>Process and fulfill gaming service orders with precision and punctuality.</li>
              <li>Manage user authentication, Role-Based Access Control (RBAC), and internal work shifts.</li>
              <li>Maintain platform integrity, prevent unauthorized access, and perform operational audits.</li>
              <li>Enhance user interface responsiveness and maintain high platform stability.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              3. Data Security & Protection Standards
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We enforce modern industry security standards, including Transport Layer Security (TLS/HTTPS) encryption, Row-Level Security (RLS) policies on our PostgreSQL Supabase databases, and robust password hashing (Argon2id/Bcrypt) to ensure that your data is safe against unauthorized disclosure.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              4. Third-Party Disclosures
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku does not sell, rent, trade, or monetize personal information. Data is only processed through verified enterprise cloud infrastructure providers (such as Supabase and Upstash) strictly for application runtime requirements.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              5. Data Subject Rights & Contact
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Users and internal team members possess the right to access, rectify, or request deletion of their personal records in accordance with applicable data privacy laws by contacting the Kireiku administrative team.
            </p>
          </section>
        </article>

        <footer className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Kireiku. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
