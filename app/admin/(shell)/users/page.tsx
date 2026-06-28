import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersTable } from "@/components/admin/users/users-table";
import { getCurrentStaffUser } from "@/lib/auth/staff";
import { getUsersManagerList } from "@/lib/users/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MenuIcon, UsersIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Users Manager | KireiApp",
  description: "Manage system users and SPs.",
};

export default async function AdminUsersPage() {
  const staff = await getCurrentStaffUser();

  if (!staff) {
    redirect("/admin/login");
  }

  // Member Access Blocked
  if (staff.profile.tier === "member") {
    redirect("/admin/dashboard");
  }

  const rows = await getUsersManagerList();

  return (
    <div className="flex flex-col gap-6">
      <header className="sticky top-4 z-30 w-full">
        <Card className="group/card overflow-hidden text-sm text-card-foreground ring-1 ring-foreground/10 flex flex-row items-center justify-between gap-4 rounded-xl border-border/80 bg-card/75 px-4 py-3 shadow-xl backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="md:hidden">
              <MenuIcon className="size-5" />
            </Button>
            <span className="hidden shrink-0 items-center justify-center text-primary sm:flex" aria-hidden="true">
              <UsersIcon className="size-6" />
            </span>
            <p className="truncate font-heading text-base font-bold sm:text-lg">Users Manager</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground" role="status">
              <span className="relative flex size-3" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-on opacity-45 motion-reduce:animate-none"></span>
                <span className="relative inline-flex size-3 rounded-full shadow-lg bg-status-on shadow-status-on/40"></span>
              </span>
              <span className="font-mono tabular-nums">ONLINE</span>
            </div>
          </div>
        </Card>
      </header>

      <main className="flex flex-1 flex-col gap-4">
        <UsersTable initialData={rows} currentTier={staff.profile.tier} />
      </main>
    </div>
  );
}
