import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionContainerProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function SectionContainer({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: SectionContainerProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {(eyebrow || title || description) && (
          <div className="flex max-w-3xl flex-col gap-3">
            {eyebrow && (
              <p className="font-mono text-xs font-medium tracking-[0.28em] text-primary uppercase">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="max-w-2xl text-base leading-7 text-muted-foreground text-pretty">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
