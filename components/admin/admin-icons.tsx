import {
  CalendarCheckIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  MousePointerClickIcon,
  NewspaperIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type AdminNavIconKey =
  | "absensi"
  | "content"
  | "dashboard"
  | "performance"
  | "profile"
  | "records"
  | "tracker"
  | "users";

type AdminNavIconProps = {
  "aria-hidden"?: true;
  className?: string;
  iconKey: AdminNavIconKey;
};

const adminNavIcons: Record<AdminNavIconKey, LucideIcon> = {
  absensi: CalendarCheckIcon,
  content: NewspaperIcon,
  dashboard: LayoutDashboardIcon,
  performance: ChartNoAxesCombinedIcon,
  profile: UserRoundIcon,
  records: ClipboardListIcon,
  tracker: MousePointerClickIcon,
  users: UsersIcon,
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
