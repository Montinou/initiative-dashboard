import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getTenantIdFromLocalStorage } from '@/lib/utils'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
  tenant_id: string
  area: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  is_system_admin: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const { session, profile: authProfile } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session) {
        setLoading(false)
        return
      }

      try {
        const tenantId = getTenantIdFromLocalStorage()
        const headers: Record<string, string> = {}
        
        if (tenantId) {
          headers['x-tenant-id'] = tenantId
        }

        const response = await fetch('/api/profile/user', {
          headers,
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const data = await response.json()
        setUserProfile(data.profile)
        setError(null)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [session])

  const refetchProfile = async () => {
    if (!session) return

    setLoading(true)
    try {
      const tenantId = getTenantIdFromLocalStorage()
      const headers: Record<string, string> = {}
      
      if (tenantId) {
        headers['x-tenant-id'] = tenantId
      }

      const response = await fetch('/api/profile/user', {
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      const data = await response.json()
      setUserProfile(data.profile)
      setError(null)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  return {
    userProfile,
    loading,
    error,
    refetchProfile
  }
}