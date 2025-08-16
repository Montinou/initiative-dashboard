/**
 * Fast Profile Fetch for Post-Authentication
 * 
 * This module provides optimized profile fetching specifically designed
 * to avoid the 391ms timeout issue after successful authentication.
 * 
 * The timeout occurs because RLS policies call get_current_user_tenant()
 * which can be slow on first execution after authentication.
 */

import { createClient } from '@/utils/supabase/client'

export interface FastProfile {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: string
  area_id: string | null
}

/**
 * Fast profile fetch with aggressive timeout and retry logic
 * Uses optimized query to minimize RLS overhead
 */
export async function fetchUserProfileFast(retries: number = 2): Promise<FastProfile | null> {
  const supabase = createClient()
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Fast profile fetch attempt ${attempt}/${retries}`)
      
      // First verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError?.message)
        return null
      }

      console.log('✅ User authenticated, fetching profile...')

      // Use RPC call to bypass potential RLS issues on first load
      const { data: profileData, error: profileError } = await Promise.race([
        supabase.rpc('get_user_profile_fast', { 
          user_uuid: user.id 
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000) // 3s timeout
        })
      ])

      if (profileError) {
        console.warn(`⚠️  RPC call failed (attempt ${attempt}), falling back to direct query:`, profileError.message)
        
        // Fallback to direct query with minimal fields
        const { data: fallbackData, error: fallbackError } = await Promise.race([
          supabase
            .from('user_profiles')
            .select('id, tenant_id, email, full_name, role, area_id')
            .eq('user_id', user.id)
            .single(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Fallback query timeout')), 2000) // 2s timeout
          })
        ])

        if (fallbackError) {
          throw new Error(`Fallback query failed: ${fallbackError.message}`)
        }

        console.log('✅ Profile fetched via fallback query')
        return fallbackData
      }

      console.log('✅ Profile fetched via RPC')
      return profileData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Fast profile fetch attempt ${attempt} failed:`, errorMessage)
      
      if (attempt === retries) {
        console.error('🚨 All fast profile fetch attempts failed')
        throw error
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000)
      console.log(`⏳ Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return null
}

/**
 * Initialize user session with optimized profile fetch
 * To be called immediately after successful authentication
 */
export async function initializeUserSession(): Promise<{
  success: boolean
  profile?: FastProfile
  error?: string
}> {
  try {
    console.log('🚀 Initializing user session...')
    
    const profile = await fetchUserProfileFast(3) // 3 attempts
    
    if (!profile) {
      return {
        success: false,
        error: 'Could not fetch user profile'
      }
    }

    console.log('✅ User session initialized successfully')
    return {
      success: true,
      profile
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Session initialization failed'
    console.error('🚨 Session initialization failed:', errorMessage)
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Check if initialization should be retried based on error type
 */
export function shouldRetryInitialization(error: string): boolean {
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'temporary',
    'unavailable'
  ]
  
  return retryableErrors.some(keyword => 
    error.toLowerCase().includes(keyword)
  )
}
