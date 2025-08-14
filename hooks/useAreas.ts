import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { Area, UserProfile } from '@/lib/types/database'

// Extended area type with relations
export interface AreaWithRelations extends Area {
  manager?: UserProfile | null
  user_profiles?: {
    id: string
    full_name: string | null
    email: string
  } | null
  stats?: {
    total: number
    total_objectives: number
    total_initiatives: number
    total_activities: number
    completed_initiatives: number
    completed_activities: number
    average_progress: number
  }
}

interface AreasResponse {
  areas: AreaWithRelations[]
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
  tenant_id?: string  // Allow explicit tenant filtering
}

// Raw area data from API 
interface AreaApiResponse {
  id: string
  name: string
  description?: string
  manager_id?: string
  tenant_id: string
  created_at: string
  updated_at: string
  is_active: boolean
  user_profiles?: {
    id: string
    full_name: string | null
    email: string
  } | null
  manager?: UserProfile | null
  stats?: {
    total: number
    total_objectives: number
    total_initiatives: number
    total_activities: number
    completed_initiatives: number
    completed_activities: number
    average_progress: number
  }
}

export function useAreas(params: UseAreasParams = {}) {
  const { session, profile, loading: authLoading } = useAuth()
  const [data, setData] = useState<AreasResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAreas = useCallback(async () => {
    // If auth is still loading, don't fetch yet
    if (authLoading) {
      console.log('useAreas: Auth still loading, waiting...')
      setLoading(true) // Keep loading while auth is loading
      return
    }

    // Wait for both session and profile to be ready
    if (!session?.user || !profile?.tenant_id) {
      console.log('useAreas: Waiting for complete auth context', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasTenantId: !!profile?.tenant_id,
        authLoading
      })
      // Don't set error, just wait for auth to complete
      setData(null)
      setError(null)
      setLoading(authLoading) // Mirror auth loading state
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: String(params.page || 1),
        pageSize: String(params.limit || 50),  // API expects pageSize, not limit
      })

      // Only add tenant_id if available
      if (params.tenant_id || profile?.tenant_id) {
        queryParams.append('tenant_id', params.tenant_id || profile.tenant_id)
      }

      if (params.search) {
        queryParams.append('search', params.search)
      }

      if (params.includeStats) {
        queryParams.append('includeStats', 'true')
      }

      // Add role-based filtering for managers if profile is available
      if (profile?.role === 'Manager' && profile?.area_id) {
        queryParams.append('area_id', profile.area_id)
      }

      const response = await fetch(`/api/areas?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.error('useAreas: Authentication failed - token may be expired')
          // Don't show error during initial load
          if (!authLoading) {
            throw new Error('Authentication failed. Please sign in again.')
          }
          return
        }
        throw new Error(`Failed to fetch areas: ${response.statusText}`)
      }

      const result = await response.json()
      
      // The API returns { data: areas[], count: number }
      const areas: AreaApiResponse[] = result.data || []
      const count = result.count || 0
      
      // Map areas to include manager information correctly
      const areasWithManager: AreaWithRelations[] = areas.map((area) => ({
        ...area,
        manager: area.user_profiles || area.manager || null,
        // Ensure manager_id is correctly set
        manager_id: area.manager_id || area.user_profiles?.id || null
      }))

      setData({
        areas: areasWithManager,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: count,
          totalPages: Math.ceil(count / (params.limit || 10))
        }
      })
    } catch (err) {
      console.error('Error fetching areas:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch areas')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [session, profile, authLoading, params.page, params.limit, params.search, params.includeStats, params.tenant_id])

  // Function to create a new area
  const createArea = async (area: {
    name: string
    description?: string
    manager_id?: string
  }) => {
    if (!session?.user || !profile?.tenant_id) {
      throw new Error('No session or tenant context available')
    }

    const response = await fetch('/api/areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...area,
        tenant_id: profile.tenant_id
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create area')
    }

    const newArea = await response.json()
    
    // Refresh the areas list
    await fetchAreas()
    
    return newArea
  }

  // Function to update an area
  const updateArea = async (id: string, updates: {
    name?: string
    description?: string
    manager_id?: string | null
  }) => {
    if (!session?.user) {
      throw new Error('No session available')
    }

    const response = await fetch(`/api/areas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update area')
    }

    const updatedArea = await response.json()
    
    // Update local state
    if (data) {
      setData({
        ...data,
        areas: data.areas.map(a => a.id === id ? { ...a, ...updatedArea } : a)
      })
    }
    
    return updatedArea
  }

  // Function to delete an area
  const deleteArea = async (id: string) => {
    if (!session?.user) {
      throw new Error('No session available')
    }

    const response = await fetch(`/api/areas/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete area')
    }

    // Remove from local state
    if (data) {
      setData({
        ...data,
        areas: data.areas.filter(a => a.id !== id)
      })
    }
  }

  // Function to assign a manager to an area
  const assignManager = async (areaId: string, managerId: string | null) => {
    return updateArea(areaId, { manager_id: managerId })
  }

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  return {
    areas: data?.areas || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
    assignManager
  }
}