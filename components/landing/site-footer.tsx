import type { LandingData } from "@/lib/db/landing";
import { Separator } from "@/components/ui/separator";

type SiteFooterProps = {
  footer: LandingData["footer"];
};

const footerLinks = [
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-kireiku" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export function SiteFooter({ footer }: SiteFooterProps) {
  return (
    <footer className="border-t border-border/60 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <div className="flex max-w-md flex-col items-center gap-3">
          <p className="text-xl font-extrabold tracking-tight" translate="no">
            Kireiku<span className="text-primary">.</span>
          </p>
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            {footer.brandSummary}
          </p>
        </div>

        <nav className="flex flex-wrap justify-center gap-2" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={footer.g2gUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-1.5 text-sm text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            G2G Store
          </a>
          {footer.socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-1.5 text-sm text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </div>

        <Separator className="max-w-4xl" />

        <p className="text-xs text-muted-foreground">{footer.copyright}</p>
      </div>
    </footer>
  );
}
