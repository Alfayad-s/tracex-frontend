import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS classes; later classes override earlier.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
