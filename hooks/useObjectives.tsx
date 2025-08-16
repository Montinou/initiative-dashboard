"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { Objective, Initiative } from '@/lib/types/database'

// Extended objective type with relations
export interface ObjectiveWithRelations extends Objective {
  initiatives?: Initiative[]
  area_name?: string
  created_by_name?: string
  initiative_count?: number
  completion_percentage?: number
}

interface UseObjectivesParams {
  start_date?: string
  end_date?: string
  include_initiatives?: boolean
  useinitiatives?: boolean
}

/**
 * Simplified useObjectives hook
 * - No complex dependencies that cause re-renders
 * - Simple fetch with cookies
 * - RLS handles tenant filtering automatically
 */
export function useObjectives(params: UseObjectivesParams = {}) {
  const { profile, loading: authLoading, user } = useAuth()
  const [objectives, setObjectives] = useState<ObjectiveWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchObjectives = useCallback(async () => {
    // Only fetch when auth is complete
    if (authLoading || !user || !profile) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const queryParams = new URLSearchParams()
      
      // Add date range filters
      if (params.start_date) {
        queryParams.append('start_date', params.start_date)
      }
      if (params.end_date) {
        queryParams.append('end_date', params.end_date)
      }

      // Include related initiatives - support both parameter formats
      if (params.include_initiatives) {
        queryParams.append('include_initiatives', 'true')
      }
      if (params.useinitiatives) {
        queryParams.append('useinitiatives', 'true')
      }

      // Simple fetch with cookies - RLS handles tenant filtering
      const response = await fetch(`/api/objectives?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch objectives: ${response.status}`)
      }

      const data = await response.json()
      
      // Map response to include relations
      const objectivesWithRelations: ObjectiveWithRelations[] = (data.objectives || []).map((obj: any) => ({
        ...obj,
        initiatives: obj.initiatives || [],
        initiative_count: obj.initiatives?.length || 0,
        completion_percentage: calculateCompletionPercentage(obj.initiatives),
        area_name: obj.area?.name,
        created_by_name: obj.created_by_profile?.full_name
      }))

      setObjectives(objectivesWithRelations)
    } catch (err) {
      console.error('Error fetching objectives:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch objectives'))
      setObjectives([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, profile]) // Dependencies include auth state

  const createObjective = async (objective: {
    title: string
    description?: string
    area_id?: string
    start_date?: string
    end_date?: string
  }) => {
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(objective),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create objective')
      }

      const newObjective = await response.json()
      
      // Refresh list
      await fetchObjectives()
      
      return newObjective
    } catch (err) {
      console.error('Error creating objective:', err)
      throw err
    }
  }

  const updateObjective = async (id: string, updates: {
    title?: string
    description?: string
    area_id?: string
    priority?: string
    status?: string
    progress?: number
  }) => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update objective')
      }

      const updatedObjective = await response.json()
      
      // Update local state optimistically
      setObjectives(prev => prev.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      ))
      
      return updatedObjective
    } catch (err) {
      console.error('Error updating objective:', err)
      // Refresh on error to ensure consistency
      fetchObjectives()
      throw err
    }
  }

  const deleteObjective = async (id: string) => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete objective')
      }

      // Remove from local state optimistically
      setObjectives(prev => prev.filter(obj => obj.id !== id))
    } catch (err) {
      console.error('Error deleting objective:', err)
      // Refresh on error to ensure consistency
      fetchObjectives()
      throw err
    }
  }

  const linkToInitiative = async (objectiveId: string, initiativeId: string) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}/link-initiative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ initiative_id: initiativeId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to link initiative')
      }

      // Refresh to get updated relationships
      await fetchObjectives()
    } catch (err) {
      console.error('Error linking initiative:', err)
      throw err
    }
  }

  const unlinkFromInitiative = async (objectiveId: string, initiativeId: string) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}/unlink-initiative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ initiative_id: initiativeId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlink initiative')
      }

      // Refresh to get updated relationships
      await fetchObjectives()
    } catch (err) {
      console.error('Error unlinking initiative:', err)
      throw err
    }
  }

  // Simple useEffect - only runs once on mount
  useEffect(() => {
    fetchObjectives()
  }, [fetchObjectives]) // Depends on fetchObjectives which includes auth state

  return {
    objectives,
    loading: authLoading || loading, // Loading if waiting for auth OR fetching data
    error,
    refetch: fetchObjectives,
    createObjective,
    updateObjective,
    deleteObjective,
    linkToInitiative,
    unlinkFromInitiative,
  }
}

// Helper function to calculate completion percentage
function calculateCompletionPercentage(initiatives?: any[]): number {
  if (!initiatives || initiatives.length === 0) return 0
  
  const totalProgress = initiatives.reduce((sum, init) => {
    return sum + (init.progress || 0)
  }, 0)
  
  return Math.round(totalProgress / initiatives.length)
}