import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const MEDIA_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_BASE_URL || 'https://rec-kiosk-api-31875.azurewebsites.net') 
  : "";

export function getMediaUrl(path: string): string {
  if (!path) return "";
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // In development, use relative path (will be handled by Vite proxy)
  if (!import.meta.env.PROD) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // In production, prepend the media base URL
  return MEDIA_BASE_URL + (path.startsWith('/') ? path : `/${path}`);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
