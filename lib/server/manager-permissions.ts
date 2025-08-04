/**
 * Server-only manager permission utilities
 * These functions require server-side supabase client access
 */

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';
import { UserRole } from '../role-permissions';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

// Helper to create server client
const createServerClient = async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
};

/**
 * Get manager's permissions based on their role and area assignment
 * @param userId - The user ID to check permissions for
 * @param tenantId - The tenant ID to scope the permissions
 * @returns Object containing permission flags
 */
export async function getManagerPermissions(userId: string, tenantId: string) {
  try {
    const supabase = await createServerClient();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, area_id, is_active')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !profile || !profile.is_active) {
      return {
        canViewArea: false,
        canEditArea: false,
        canViewInitiatives: false,
        canEditInitiatives: false,
        canViewFiles: false,
        canUploadFiles: false,
        isManager: false,
        isActive: false
      };
    }

    const userRole = profile.role as UserRole;
    const isManager = userRole === 'Manager' && profile.area_id !== null;
    const isAdmin = userRole === 'Admin';

    return {
      canViewArea: isManager || isAdmin,
      canEditArea: isManager || isAdmin,
      canViewInitiatives: isManager || isAdmin,
      canEditInitiatives: isManager || isAdmin,
      canViewFiles: true, // All active users can view files
      canUploadFiles: isManager || isAdmin,
      isManager,
      isActive: profile.is_active,
      role: userRole,
      areaId: profile.area_id
    };
  } catch (error) {
    console.error('Error getting manager permissions:', error);
    return {
      canViewArea: false,
      canEditArea: false,
      canViewInitiatives: false,
      canEditInitiatives: false,
      canViewFiles: false,
      canUploadFiles: false,
      isManager: false,
      isActive: false
    };
  }
}

/**
 * Get the area ID assigned to a manager
 * @param userId - The user ID to get area for
 * @param tenantId - The tenant ID to scope the query
 * @returns The area ID if found, null otherwise
 */
export async function getManagerAreaId(userId: string, tenantId: string): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('area_id, role, is_active')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !profile || !profile.is_active) {
      return null;
    }

    const userRole = profile.role as UserRole;
    
    // Only return area_id for Managers, Admins can access all areas
    if (userRole === 'Manager' && profile.area_id) {
      return profile.area_id;
    }

    return null;
  } catch (error) {
    console.error('Error getting manager area ID:', error);
    return null;
  }
}