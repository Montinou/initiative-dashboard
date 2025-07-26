import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  tenant_id: string
  avatar_url?: string
  phone?: string
  title?: string
  bio?: string
}

export function useUserProfile() {
  const { profile: authProfile } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authProfile?.access_token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/profile/user', {
          headers: {
            'Authorization': `Bearer ${authProfile.access_token}`
          }
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
  }, [authProfile])

  const refetchProfile = async () => {
    if (!authProfile?.access_token) return

    setLoading(true)
    try {
      const response = await fetch('/api/profile/user', {
        headers: {
          'Authorization': `Bearer ${authProfile.access_token}`
        }
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