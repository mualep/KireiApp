import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-kireiku" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4 sm:top-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 rounded-full border border-border/70 bg-card/70 px-4 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:h-14 sm:px-5">
        <Link
          href="/"
          className="group flex items-center gap-1 rounded-full text-sm font-extrabold tracking-tight text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Kireiku home"
        >
          <span translate="no">Kireiku</span>
          <span className="text-primary" aria-hidden="true">
            .
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <a href={item.href}>{item.label}</a>
            </Button>
          ))}
        </nav>

        <Button
          asChild
          size="sm"
          className="rounded-full px-4 shadow-lg shadow-primary/20"
        >
          <a href="https://www.g2g.com/KireiBoost" target="_blank" rel="noreferrer">
            Order Now
          </a>
        </Button>
      </div>
    </header>
  );
}
