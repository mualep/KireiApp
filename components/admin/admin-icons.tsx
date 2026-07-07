import {
  CalendarCheckIcon,
  ChartNoAxesCombinedIcon,
  ClipboardClockIcon,
  LayoutDashboardIcon,
  IdCardIcon,
  NewspaperIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  UserRoundIcon,
  UserRoundCheckIcon,
  UserCogIcon,
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
  | "users"
  | "dailyTask";

type AdminNavIconProps = {
  "aria-hidden"?: true;
  className?: string;
  iconKey: AdminNavIconKey;
};

const adminNavIcons: Record<AdminNavIconKey, LucideIcon> = {
  absensi: UserRoundCheckIcon,
  content: NewspaperIcon,
  dashboard: LayoutDashboardIcon,
  performance: ChartNoAxesCombinedIcon,
  profile: UserRoundIcon,
  records: ClipboardClockIcon,
  tracker: IdCardIcon,
  users: UserCogIcon,
  dailyTask: CalendarCheckIcon,
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
