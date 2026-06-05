import {
  CalendarCheckIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  NewspaperIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

export type AdminNavIconKey =
  | "absensi"
  | "content"
  | "dashboard"
  | "profile"
  | "tracker";

type AdminNavIconProps = {
  "aria-hidden"?: true;
  className?: string;
  iconKey: AdminNavIconKey;
};

const adminNavIcons: Record<AdminNavIconKey, LucideIcon> = {
  absensi: CalendarCheckIcon,
  content: NewspaperIcon,
  dashboard: LayoutDashboardIcon,
  profile: UserRoundIcon,
  tracker: MousePointerClickIcon,
};

export function AdminNavIcon({
  "aria-hidden": ariaHidden = true,
  className,
  iconKey,
}: AdminNavIconProps) {
  const Icon = adminNavIcons[iconKey];

  return <Icon aria-hidden={ariaHidden} className={className} />;
}

export { SidebarCloseIcon, SidebarOpenIcon };
