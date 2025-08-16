/**
 * Secure Fetch Utilities
 * Following Supabase best practices for client-side API calls
 * 
 * This module provides secure helpers for making authenticated API requests
 * following the patterns outlined in docs/supabase-sesion.md
 */

import { createClient } from '@/utils/supabase/client'

export interface SecureFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

/**
 * Secure authenticated fetch that follows Supabase best practices
 * 
 * Steps:
 * 1. Validates user with getUser() (cannot be spoofed)
 * 2. Gets fresh session for access token
 * 3. Makes authenticated request
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (headers will be merged with auth)
 * @throws Error if user is not authenticated or no valid session
 */
export async function secureFetch(url: string, options: SecureFetchOptions = {}): Promise<Response> {
  const supabase = createClient()
  
  // Step 1: Validate user with getUser() per Supabase best practices
  // This verifies the JWT and cannot be spoofed (docs/supabase-sesion.md line 538)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  // Step 2: Get access token from auth state
  // We need to get the access token from the current session
  // Using a promise to wait for auth state
  const accessToken = await new Promise<string>((resolve, reject) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        subscription.unsubscribe()
        resolve(session.access_token)
      } else {
        subscription.unsubscribe()
        reject(new Error('No valid session found'))
      }
    })
    // Timeout after 1.5 seconds (reduced from 2s to prevent 391ms buildup)
    setTimeout(() => {
      subscription.unsubscribe()
      reject(new Error('Session fetch timeout'))
    }, 1500)
  })

  // Step 3: Merge authentication headers with provided headers
  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers
  }

  // Step 4: Make authenticated request
  return fetch(url, {
    ...options,
    headers: authHeaders
  })
}

/**
 * Secure authenticated fetch for JSON APIs
 * Automatically sets Content-Type and handles JSON response
 */
export async function secureFetchJSON(url: string, options: SecureFetchOptions = {}): Promise<any> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  const response = await secureFetch(url, {
    ...options,
    headers
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  return response.json()
}

/**
 * Get current authenticated user (client-side)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return error ? null : user
  } catch {
    return null
  }
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user
}

/**
 * Get access token for current session
 * Returns null if not authenticated or no session
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // First validate user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return null
    }
    
    // Get access token from auth state
    return await new Promise<string | null>((resolve) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        subscription.unsubscribe()
        resolve(session?.access_token || null)
      })
      // Timeout after 1.5 seconds (reduced to prevent timeout accumulation)
      setTimeout(() => {
        subscription.unsubscribe()
        resolve(null)
      }, 1500)
    })
  } catch {
    return null
  }
}
