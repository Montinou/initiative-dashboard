/**
 * Server-only theme configuration utilities
 * These functions require server-side supabase client access
 */

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Helper to create server client
const createServerClient = async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
};

// Mapping from domains to actual tenant UUIDs from database
// This bridges the gap between domain-based theme selection and database tenant IDs
const DOMAIN_TO_TENANT_ID: Record<string, string> = {
  'fema-electricidad': '550e8400-e29b-41d4-a716-446655440000', // FEMA UUID from database
  'siga-turismo': '550e8400-e29b-41d4-a716-446655440001', // SIGA UUID from database
  'stratix-platform': '550e8400-e29b-41d4-a716-446655440002', // Stratix UUID from database
  'default': null // No specific tenant ID for default theme
};

/**
 * Get tenant ID from database by subdomain lookup
 * @param domain - The domain hostname to look up
 * @returns Actual tenant UUID from database query
 */
export async function getTenantIdFromDomainAsync(domain: string): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    
    // Extract subdomain from domain
    const subdomain = domain.split('.')[0];
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single();
    
    if (error || !tenant) {
      console.log('🔍 getTenantIdFromDomainAsync: No tenant found for subdomain:', subdomain);
      return null;
    }
    
    console.log('🔍 getTenantIdFromDomainAsync: Found tenant ID:', tenant.id, 'for subdomain:', subdomain);
    return tenant.id;
  } catch (error) {
    console.error('Error looking up tenant by domain:', error);
    return null;
  }
}