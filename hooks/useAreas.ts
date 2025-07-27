import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

interface Area {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user_profiles?: {
    id: string
    full_name: string | null
    email: string
  } | null
  stats?: {
    total: number
    planning: number
    in_progress: number
    completed: number
    on_hold: number
  }
}

interface AreasResponse {
  areas: Area[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseAreasParams {
  page?: number
  limit?: number
  search?: string
  includeStats?: boolean
}

export function useAreas(params: UseAreasParams = {}) {
  const { session } = useAuth()
  const [data, setData] = useState<AreasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAreas = useCallback(async () => {
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
      if (params.includeStats) searchParams.set('includeStats', 'true')

      const response = await fetch(`/api/areas?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch areas')
      }

      const data = await response.json()
      setData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching areas:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch areas')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [session, params.page, params.limit, params.search, params.includeStats])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const createArea = async (areaData: {
    name: string
    description?: string
    manager_id?: string
  }) => {
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(areaData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create area')
      }

      const result = await response.json()
      
      // Refresh the areas list
      await fetchAreas()
      
      return result
    } catch (err) {
      console.error('Error creating area:', err)
      throw err
    }
  }

  const refetch = useCallback(() => {
    return fetchAreas()
  }, [fetchAreas])

  return {
    data,
    areas: data?.areas || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch,
    createArea
  }
}