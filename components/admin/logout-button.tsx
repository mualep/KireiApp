"use client";

import { signOutStaff } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LogoutButtonProps = {
  children: React.ReactNode;
};

export function LogoutButton({ children }: LogoutButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apakah Anda Yakin Ingin Logout?</DialogTitle>
          <DialogDescription>
            Sesi admin Anda akan berakhir dan Anda akan kembali ke halaman login.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Batal
            </Button>
          </DialogClose>
          <form action={signOutStaff}>
            <Button
              type="submit"
              variant="default"
            >
              Ya, Logout
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
