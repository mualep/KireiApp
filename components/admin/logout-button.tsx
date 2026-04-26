"use client";

import { signOutStaff } from "@/app/admin/actions";

type LogoutButtonProps = {
  children: React.ReactNode;
};

export function LogoutButton({ children }: LogoutButtonProps) {
  return <form action={signOutStaff}>{children}</form>;
}
