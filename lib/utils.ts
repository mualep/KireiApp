import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOperationalDate(date: Date): string {
  // WIB timezone offset is +7 hours
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const hour = wibDate.getUTCHours();
  
  if (hour < 6) {
    wibDate.setUTCDate(wibDate.getUTCDate() - 1);
  }
  
  const yyyy = wibDate.getUTCFullYear();
  const mm = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(wibDate.getUTCDate()).padStart(2, "0");
  
  return `${yyyy}-${mm}-${dd}`;
}
