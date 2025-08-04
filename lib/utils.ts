import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTenantIdFromLocalStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const userProfileData = localStorage.getItem('user_profile_v2')
    if (!userProfileData) {
      return null;
    }
    
    const parsedData = JSON.parse(userProfileData);
    return parsedData?.profile?.tenant_id || null;
  } catch (error) {
    console.error('Error parsing user profile from localStorage:', error);
    return null;
  }
}
