import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Book02Icon,
  ChartIncreaseIcon,
  Clock01Icon,
  DashboardSquare01Icon,
  IdCardIcon,
  NewsIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Task01Icon,
  UserCheck01Icon,
  UserIcon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";

export type AdminNavIconKey =
  | "absensi"
  | "content"
  | "dashboard"
  | "performance"
  | "profile"
  | "records"
  | "tracker"
  | "users"
  | "dailyTask"
  | "rules";

type AdminNavIconProps = {
  "aria-hidden"?: true | "true" | "false";
  className?: string;
  iconKey: AdminNavIconKey;
  "data-icon"?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adminNavIcons: Record<AdminNavIconKey, any> = {
  absensi: UserCheck01Icon,
  content: NewsIcon,
  dashboard: DashboardSquare01Icon,
  performance: ChartIncreaseIcon,
  profile: UserIcon,
  records: Clock01Icon,
  tracker: IdCardIcon,
  users: UserSettings01Icon,
  dailyTask: Task01Icon,
  rules: Book02Icon,
};

export function AdminNavIcon({
  "aria-hidden": ariaHidden = true,
  className,
  iconKey,
  ...rest
}: AdminNavIconProps) {
  const iconData = adminNavIcons[iconKey];

  if (!iconData) return null;

  return (
    <HugeiconsIcon
      icon={iconData}
      aria-hidden={ariaHidden}
      className={className}
      {...(rest as any)}
    />
  );
}

export function SidebarCloseIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: React.SVGProps<SVGSVGElement> & { "data-icon"?: string; "aria-hidden"?: true | "true" | "false" }) {
  return (
    <HugeiconsIcon
      icon={SidebarLeft01Icon}
      aria-hidden={ariaHidden}
      className={className}
      {...(props as any)}
    />
  );
}

export function SidebarOpenIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: React.SVGProps<SVGSVGElement> & { "data-icon"?: string; "aria-hidden"?: true | "true" | "false" }) {
  return (
    <HugeiconsIcon
      icon={SidebarRight01Icon}
      aria-hidden={ariaHidden}
      className={className}
      {...(props as any)}
    />
  );
}
