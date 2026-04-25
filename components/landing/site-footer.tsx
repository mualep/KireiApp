import type { LandingData } from "@/lib/db/landing";
import { Separator } from "@/components/ui/separator";

type SiteFooterProps = {
  footer: LandingData["footer"];
};

export function SiteFooter({ footer }: SiteFooterProps) {
  return (
    <footer className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-2xl shadow-black/20">
        <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr]">
          <div className="flex max-w-xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                K
              </span>
              <div>
                <p className="font-semibold" translate="no">
                  Kireiku
                </p>
                <p className="text-sm text-muted-foreground">Game boosting with a cleaner flow.</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground text-pretty">
              {footer.brandSummary}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <p className="font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
              Connect
            </p>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <a
                href={footer.g2gUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-2.5 py-1.5 text-sm text-foreground underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                G2G Store
              </a>
              {footer.socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-2.5 py-1.5 text-sm text-foreground underline-offset-4 hover:bg-muted hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <p className="text-xs text-muted-foreground">{footer.copyright}</p>
      </div>
    </footer>
  );
}
