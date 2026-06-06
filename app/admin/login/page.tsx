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
  description: "Sign in to KireiApp staff workspace.",
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
        className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,var(--primary),transparent_30%),radial-gradient(circle_at_78%_20%,var(--secondary),transparent_34%),radial-gradient(circle_at_50%_100%,var(--primary),transparent_46%)] opacity-20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4.75rem_4.75rem] opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0,transparent_23px,var(--border)_24px)] bg-[size:100%_24px] opacity-[0.05]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
        <section className="flex flex-1 items-center justify-center py-12">
          <div className="flex w-full max-w-md flex-col items-center">
            <Card className="relative w-full overflow-visible rounded-[1.65rem] border border-border/70 bg-card/70 p-0 text-left shadow-2xl shadow-primary/15 backdrop-blur-xl">
              <div
                aria-hidden="true"
                className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
              />
              <CardContent className="relative flex flex-col p-6 sm:p-8">
                <div className="mx-auto -mt-14 mb-7 flex h-20 items-center justify-center rounded-2xl border border-primary/25 bg-background/85 px-5 text-foreground shadow-2xl shadow-primary/25 backdrop-blur">
                  <KireiAppLogo
                    variant="horizontal"
                    priority
                    markClassName="size-11"
                    textClassName="text-xl"
                  />
                </div>

                <div className="text-center">
                  <h1 className="font-heading text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                    Welcome back
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                    Sign in to <span translate="no">KireiApp</span> to continue.
                  </p>
                </div>

                <div className="my-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

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
