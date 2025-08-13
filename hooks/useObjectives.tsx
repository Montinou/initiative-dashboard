"use client"

import { useState, useEffect, useCallback } from 'react'
import type { Objective, Initiative } from '@/lib/types/database'
import { useAuth } from '@/lib/auth-context'

// Extended objective type with relations
export interface ObjectiveWithRelations extends Objective {
  initiatives?: Initiative[]
  area_name?: string
  created_by_name?: string
  initiative_count?: number
  completion_percentage?: number
}

interface UseObjectivesParams {
  area_id?: string
  start_date?: string
  end_date?: string
  include_initiatives?: boolean
  useinitiatives?: boolean
}

export function useObjectives(params: UseObjectivesParams = {}) {
  const [objectives, setObjectives] = useState<ObjectiveWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { profile, loading: authLoading } = useAuth()

  const fetchObjectives = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('useObjectives: Auth still loading, waiting...')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (!profile?.tenant_id) {
        console.log('useObjectives: No tenant ID available yet')
        setObjectives([])
        setLoading(false)
        return
      }

      // Build query params
      const queryParams = new URLSearchParams({
        tenant_id: profile.tenant_id
      })

      // Add area filter
      if (params.area_id) {
        queryParams.append('area_id', params.area_id)
      } else if (profile.role === 'Manager' && profile.area_id) {
        // Managers only see their area's objectives
        queryParams.append('area_id', profile.area_id)
      }

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

      const response = await fetch(`/api/objectives?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.log('useObjectives: Fetched', objectivesWithRelations.length, 'objectives')
    } catch (err) {
      console.error('Error fetching objectives:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch objectives'))
      setObjectives([])
    } finally {
      setLoading(false)
    }
  }, [profile, params.area_id, params.start_date, params.end_date, params.include_initiatives, params.useinitiatives, authLoading])

  const createObjective = async (objective: {
    title: string
    description?: string
    area_id?: string
    start_date?: string
    end_date?: string
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      const requestBody = {
        ...objective,
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        area_id: objective.area_id || profile.area_id
      }

      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
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
      
      // Update local state
      setObjectives(prev => prev.map(obj => 
        obj.id === id ? { ...obj, ...updatedObjective } : obj
      ))
      
      return updatedObjective
    } catch (err) {
      console.error('Error updating objective:', err)
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

      // Remove from local state
      setObjectives(prev => prev.filter(obj => obj.id !== id))
    } catch (err) {
      console.error('Error deleting objective:', err)
      throw err
    }
  }

  // Quarter linking removed - now using date fields directly

  const linkObjectiveToInitiative = async (objectiveId: string, initiativeId: string) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}/initiatives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ initiative_id: initiativeId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to link objective to initiative')
      }

      // Refresh to get updated relations
      await fetchObjectives()
      
      return await response.json()
    } catch (err) {
      console.error('Error linking objective to initiative:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchObjectives()
  }, [fetchObjectives])

  return {
    objectives,
    loading,
    error,
    refetch: fetchObjectives,
    createObjective,
    updateObjective,
    deleteObjective,
    linkObjectiveToInitiative
  }
}

// Helper function to calculate completion percentage
function calculateCompletionPercentage(initiatives?: Initiative[]): number {
  if (!initiatives || initiatives.length === 0) return 0
  
  const totalProgress = initiatives.reduce((sum, init) => sum + (init.progress || 0), 0)
  return Math.round(totalProgress / initiatives.length)
}