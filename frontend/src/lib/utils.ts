import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const MEDIA_BASE_URL = "https://rec-kiosk-media.onrender.com";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
