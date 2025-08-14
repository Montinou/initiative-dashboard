import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

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
  const { profile: authProfile, loading: authLoading } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authLoading) {
        console.log('useUserProfile: Auth still loading, waiting...')
        return
      }
      
      if (!authProfile?.tenant_id) {
        console.log('useUserProfile: No tenant_id available yet')
        setLoading(false)
        return
      }

      try {
        // Use authProfile tenant_id if available
        const tenantId = authProfile?.tenant_id || localStorage.getItem('tenantId')
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
  }, [authProfile?.tenant_id, authLoading])

  const refetchProfile = async () => {
    if (!authProfile?.tenant_id) return

    setLoading(true)
    try {
      // Use authProfile tenant_id if available
      const tenantId = authProfile?.tenant_id || localStorage.getItem('tenantId')
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