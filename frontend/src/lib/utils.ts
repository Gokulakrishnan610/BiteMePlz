import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// In production, media may be served from Azure Blob Storage (full URL returned by backend)
// or from the API server itself. Always prefer full URLs returned by the backend.
export const MEDIA_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL || 'https://rec-kiosk-api-31875.azurewebsites.net')
  : "";

export function getMediaUrl(path: string): string {
  if (!path) return "";

  // Already a full URL (blob storage, external CDN, or http image URL) — use as-is
  if (path.startsWith('http')) {
    return path;
  }

  // Development: relative path handled by Vite proxy
  if (!import.meta.env.PROD) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Production fallback: prepend API base URL (local media serving)
  return MEDIA_BASE_URL + (path.startsWith('/') ? path : `/${path}`);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
