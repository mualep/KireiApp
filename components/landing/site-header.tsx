import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Services", href: "#services" },
  { label: "Why Kireiku", href: "#why-kireiku" },
  { label: "Process", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3" aria-label="Kireiku home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
            K
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-semibold tracking-tight" translate="no">
              Kireiku
            </span>
            <span className="text-xs text-muted-foreground">Game Boosting</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <a href={item.href}>{item.label}</a>
            </Button>
          ))}
        </nav>

        <Button asChild size="sm">
          <a href="https://www.g2g.com/KireiBoost" target="_blank" rel="noreferrer">
            Order Now
          </a>
        </Button>
      </div>
    </header>
  );
}
