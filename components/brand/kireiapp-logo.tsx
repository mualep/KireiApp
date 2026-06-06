import Image from "next/image";

import { cn } from "@/lib/utils";

type KireiAppLogoVariant = "compact" | "horizontal" | "mark";

type KireiAppLogoProps = {
  ariaLabel?: string;
  className?: string;
  decorative?: boolean;
  markClassName?: string;
  priority?: boolean;
  textClassName?: string;
  variant?: KireiAppLogoVariant;
};

const logoMarkSrc = "/brand/kireiapp-mark.svg";
const markSizes = {
  compact: 44,
  horizontal: 44,
  mark: 64,
} satisfies Record<KireiAppLogoVariant, number>;

export function KireiAppLogo({
  ariaLabel,
  className,
  decorative = false,
  markClassName,
  priority = false,
  textClassName,
  variant = "horizontal",
}: KireiAppLogoProps) {
  const markSize = markSizes[variant];
  const showsText = variant === "horizontal";
  const accessibleLabel =
    decorative ? undefined : (ariaLabel ?? (showsText ? undefined : "KireiApp"));

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex min-w-0 items-center text-current",
        showsText ? "gap-2" : "justify-center",
        className,
      )}
      translate="no"
    >
      <Image
        src={logoMarkSrc}
        alt=""
        width={markSize}
        height={markSize}
        priority={priority}
        className={cn(
          "block shrink-0 object-contain",
          variant === "mark" && "size-16",
          variant === "compact" && "size-11",
          showsText && "size-11",
          markClassName,
        )}
      />
      {showsText ? (
        <span
          className={cn(
            "min-w-0 truncate font-heading text-sm font-black tracking-tight text-current",
            textClassName,
          )}
        >
          KireiApp
        </span>
      ) : (
        !decorative && <span className="sr-only">KireiApp</span>
      )}
    </span>
  );
}
