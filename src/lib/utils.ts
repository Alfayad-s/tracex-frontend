import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS classes; later classes override earlier.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as Indian Rupee (₹) currency.
 */
export function formatRupee(amount: number): string {
  return rupeeFormatter.format(amount);
}
