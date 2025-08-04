/**
 * Server-only query validation utilities
 * These functions require server-side supabase client access
 */

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Helper to create server client
const createServerClient = async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
};

/**
 * Validate that a manager has access to a specific area
 * @param areaId - The area ID to validate access for
 * @param userId - The user ID requesting access
 * @param tenantId - The tenant ID to scope the validation
 * @returns True if the manager has access, false otherwise
 */
export async function validateManagerArea(
  areaId: string,
  userId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    
    // First, get the user's profile to check their role and assigned area
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, area_id, is_active')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (profileError || !profile || !profile.is_active) {
      console.error('Error fetching user profile:', profileError);
      return false;
    }

    // Admins and CEOs can access all areas
    if (profile.role === 'Admin' || profile.role === 'CEO') {
      // Still validate that the area exists in the tenant
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', areaId)
        .eq('tenant_id', tenantId)
        .single();

      return !areaError && area !== null;
    }

    // Managers can only access their assigned area
    if (profile.role === 'Manager') {
      return profile.area_id === areaId;
    }

    // Analysts have read-only access to all areas
    if (profile.role === 'Analyst') {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('id', areaId)
        .eq('tenant_id', tenantId)
        .single();

      return !areaError && area !== null;
    }

    // Default deny for any other cases
    return false;
  } catch (error) {
    console.error('Error validating manager area access:', error);
    return false;
  }
}