import useSWR from 'swr'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface DashboardInsights {
  summary: string
  keyInsights: string[]
  performanceHighlights?: string[]
  areaAnalysis?: string[]
  trendsAndPatterns?: string[]
  risks: string[]
  opportunities: string[]
  recommendations: string[]
  actionPriorities?: string[]
}

interface UseDashboardInsightsReturn {
  insights: DashboardInsights | null
  loading: boolean
  error: any
  cached: boolean
  generatedAt: string | null
  regenerate: () => Promise<void>
  regenerating: boolean
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard insights')
  }

  return response.json()
}

export function useDashboardInsights(): UseDashboardInsightsReturn {
  const { profile, loading, user } = useAuth()
  const [regenerating, setRegenerating] = useState(false)
  
  // Only fetch when auth is complete and we have a valid user profile
  const shouldFetch = !loading && user && profile?.tenant_id
  
  const { data, error, mutate } = useSWR(
    shouldFetch ? '/api/dashboard/insights' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Don't auto-refresh, insights are cached
      dedupingInterval: 5 * 60 * 1000, // 5 minutes deduping to align with Redis cache
    }
  )

  const regenerate = async () => {
    try {
      setRegenerating(true)
      
      const response = await fetch('/api/dashboard/insights', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate dashboard insights')
      }

      const newData = await response.json()
      
      // Check if we got a message about recent regeneration
      if (newData.message && newData.ttl_seconds) {
        // Show message to user about wait time
        const minutes = Math.ceil(newData.ttl_seconds / 60)
        alert(newData.message || `Por favor espere ${minutes} minutos antes de regenerar nuevamente.`)
      }
      
      // Update the cache with new data
      mutate(newData, false)
    } catch (error) {
      console.error('Failed to regenerate dashboard insights:', error)
      throw error
    } finally {
      setRegenerating(false)
    }
  }

  return {
    insights: data?.insights || null,
    loading: !shouldFetch || (!data && !error), // Loading if waiting for auth OR fetching data
    error,
    cached: data?.cached || false,
    generatedAt: data?.generated_at || null,
    regenerate,
    regenerating,
  }
}
