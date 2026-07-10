import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOperationalDate(date: Date): string {
  const effectiveTime = new Date(date.getTime() + 1 * 3600 * 1000);
  return effectiveTime.toISOString().split("T")[0];
}
