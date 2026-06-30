import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOperationalDate(date: Date): string {
  // WIB timezone offset is +7 hours. Operational day starts at 06:00 AM (subtract 6 hours offset).
  // Total offset = +7 hours - 6 hours = +1 hour.
  const operationalDate = new Date(date.getTime() + 1 * 60 * 60 * 1000);
  
  const yyyy = operationalDate.getUTCFullYear();
  const mm = String(operationalDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(operationalDate.getUTCDate()).padStart(2, "0");
  
  return `${yyyy}-${mm}-${dd}`;
}
