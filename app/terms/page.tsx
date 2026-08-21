import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service | KireiApp",
  description: "Terms and Conditions governing the use of Kireiku services and platform.",
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-xs text-muted-foreground">
              Last Updated: August 21, 2026
            </p>
          </header>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              1. Acceptance of Terms
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Welcome to Kireiku (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or utilizing our digital platform, ordering gaming services, or participating as an internal team member, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use our services.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              2. Gaming & Booster Services
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku delivers premium, legitimate gaming assistance, professional boosting, leveling, and coaching services. All commercial orders and transactions are conducted through verified official channels and certified third-party merchant platforms (including G2G Marketplace) adhering to high transaction standards.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              3. User Obligations & Conduct
            </h2>
            <ul className="list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1.5">
              <li>Users agree to provide accurate, current, and complete information during order placement.</li>
              <li>Users shall not engage in fraudulent activities, exploit bugs, or disrupt system operations.</li>
              <li>Users are solely responsible for maintaining the confidentiality of their third-party credentials and access codes.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              4. Enterprise Operating Standards & Internal Compliance
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All registered players, specialists, and administrative personnel operating within the Kireiku platform are bound by internal Enterprise Rules, which mandate strict shift scheduling, performance tracking, daily task reporting, quality assurance, and non-disclosure of proprietary workflow data.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              5. Limitation of Liability
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kireiku makes every reasonable effort to maintain uninterrupted platform availability and high service execution. However, Kireiku shall not be held liable for indirect, incidental, or consequential damages resulting from third-party server downtimes, game patch disruptions, or network failures beyond our reasonable control.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-foreground font-heading">
              6. Contact & Support
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For any questions, operational inquiries, or legal clarifications regarding these Terms of Service, please contact our support desk via our official platform channels.
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
