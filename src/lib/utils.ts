import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function titleCase(value: string) { return value.replaceAll("_", " ").split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" "); }
export function formatDateTime(value?: string) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
}
