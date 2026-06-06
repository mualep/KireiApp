import Image from "next/image";

import { cn } from "@/lib/utils";

type KireiAppLogoVariant = "compact" | "horizontal" | "mark";

type KireiAppLogoProps = {
  className?: string;
  markClassName?: string;
  priority?: boolean;
  textClassName?: string;
  variant?: KireiAppLogoVariant;
};

const logoMarkSrc = "/brand/kireiapp-mark.svg";
const markSizes = {
  compact: 44,
  horizontal: 40,
  mark: 64,
} satisfies Record<KireiAppLogoVariant, number>;

export function KireiAppLogo({
  className,
  markClassName,
  priority = false,
  textClassName,
  variant = "horizontal",
}: KireiAppLogoProps) {
  const markSize = markSizes[variant];
  const showsText = variant === "horizontal";

  return (
    <span
      aria-label="KireiApp"
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
          showsText && "size-10",
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
        <span className="sr-only">KireiApp</span>
      )}
    </span>
  );
}
