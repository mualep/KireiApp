import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { KireiAppLogo } from "@/components/brand/kireiapp-logo";
import { Card, CardContent } from "@/components/ui/card";
import { getStaffRedirectPath } from "@/lib/auth/redirects";
import { getCurrentStaffUser } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Staff Login | KireiApp",
  description: "Restricted area for Kireiku staff.",
};

const footerLinks = [
  { label: "Privacy Policy", href: "#privacy-policy" },
  { label: "Terms of Service", href: "#terms-of-service" },
  { label: "Help Desk", href: "#help-desk" },
];

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const staff = await getCurrentStaffUser();

  if (staff) {
    redirect(getStaffRedirectPath(staff.profile.tier));
  }

  const params = await searchParams;
  const hasAuthError = params.error === "auth";
  const currentYear = new Date().getFullYear();

  return (
    <main className="relative flex min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4.75rem_4.75rem] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-48 -top-48 size-[42rem] rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-56 -right-48 size-[46rem] rounded-full bg-secondary/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
        <section className="flex flex-1 items-center justify-center py-12">
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-[1.4rem] border border-border/70 bg-card/80 shadow-2xl shadow-primary/20 backdrop-blur">
              <KireiAppLogo variant="mark" priority markClassName="size-14" />
            </div>

            <h1 className="font-heading text-5xl font-black tracking-tight text-foreground sm:text-6xl">
              Staff Login
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Restricted area for Kireiku staff
            </p>

            <Card className="mt-10 w-full rounded-[2rem] border border-border/70 bg-card/70 p-4 text-left shadow-2xl backdrop-blur-xl sm:p-6">
              <CardContent className="p-0">
                <LoginForm
                  initialState={
                    hasAuthError
                      ? { message: "Please sign in with a staff account." }
                      : undefined
                  }
                />
              </CardContent>
            </Card>

            <ButtonBackLink />
          </div>
        </section>

        <footer className="flex flex-col items-center gap-4 pb-2 text-center">
          <nav
            aria-label="Legal links"
            className="flex flex-wrap justify-center gap-x-6 gap-y-3"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs uppercase tracking-widest text-muted-foreground/80">
            © {currentYear} KireiApp Admin. Elite Performance Guaranteed.
          </p>
        </footer>
      </div>
    </main>
  );
}

function ButtonBackLink() {
  return (
    <Link
      href="/"
      className="mt-8 inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowLeftIcon aria-hidden="true" />
      Back to website
    </Link>
  );
}
