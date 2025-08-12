/**
 * Utility function to get tenant ID from localStorage
 * This is a client-side only function
 */
export function getTenantIdFromLocalStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    return localStorage.getItem('tenant_id');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}