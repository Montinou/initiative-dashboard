/**
 * Tenant Utility Functions
 * 
 * Common utilities for tenant-related operations.
 * These functions help retrieve tenant information without manual filtering.
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the tenant record by tenant ID
 * Used when you need to look up the tenant's information (like organization_id)
 * 
 * @param supabase - Supabase client instance
 * @param tenantId - The tenant ID to look up
 * @returns The tenant record or null if not found
 */
export async function getTenantById(
  supabase: SupabaseClient,
  tenantId: string
) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }

  return tenant;
}

/**
 * Get the organization ID for a given tenant
 * 
 * @param supabase - Supabase client instance
 * @param tenantId - The tenant ID
 * @returns The organization ID or null if not found
 */
export async function getOrganizationIdForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('organization_id')
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching tenant organization:', error);
    return null;
  }

  return tenant?.organization_id || null;
}

/**
 * Get the organization details for a user's tenant
 * 
 * @param supabase - Supabase client instance
 * @param userProfile - The user profile containing tenant_id
 * @returns The organization record or null if not found
 */
export async function getUserOrganization(
  supabase: SupabaseClient,
  userProfile: { tenant_id: string }
) {
  const organizationId = await getOrganizationIdForTenant(
    supabase,
    userProfile.tenant_id
  );

  if (!organizationId) {
    return null;
  }

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return organization;
}

/**
 * Get tenant details with organization information
 * 
 * @param supabase - Supabase client instance
 * @param tenantId - The tenant ID
 * @returns The tenant with organization details or null if not found
 */
export async function getTenantWithOrganization(
  supabase: SupabaseClient,
  tenantId: string
) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching tenant with organization:', error);
    return null;
  }

  return tenant;
}

/**
 * Check if a user belongs to a specific tenant
 * 
 * @param supabase - Supabase client instance
 * @param userId - The user ID
 * @param tenantId - The tenant ID to check
 * @returns True if the user belongs to the tenant, false otherwise
 */
export async function userBelongsToTenant(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    return false;
  }

  return profile.tenant_id === tenantId;
}