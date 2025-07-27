import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
  area: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: string
  area?: string
  status?: string
}

export function useUsers(params: UseUsersParams = {}) {
  const { session } = useAuth()
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.search) searchParams.set('search', params.search)
      if (params.role) searchParams.set('role', params.role)
      if (params.area) searchParams.set('area', params.area)
      if (params.status) searchParams.set('status', params.status)

      const response = await fetch(`/api/users?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const data = await response.json()
      setData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [session, params.page, params.limit, params.search, params.role, params.area, params.status])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = async (userData: {
    email: string
    full_name: string
    role: string
    area?: string
    phone?: string
  }) => {
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      const result = await response.json()
      
      // Refresh the users list
      await fetchUsers()
      
      return result
    } catch (err) {
      console.error('Error creating user:', err)
      throw err
    }
  }

  const refetch = useCallback(() => {
    return fetchUsers()
  }, [fetchUsers])

  return {
    data,
    users: data?.users || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch,
    createUser
  }
}