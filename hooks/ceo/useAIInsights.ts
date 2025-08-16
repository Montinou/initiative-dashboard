import useSWR from 'swr'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface AIInsights {
  summary: string
  key_insights: string[]
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    impact: string
  }>
  risks: Array<{
    level: 'critical' | 'high' | 'medium' | 'low'
    title: string
    description: string
    mitigation: string
  }>
  opportunities: Array<{
    title: string
    description: string
    potential_value: string
  }>
  performance_analysis: {
    best_performing_area: string
    needs_attention_area: string
    overall_trend: 'improving' | 'stable' | 'declining'
    trend_explanation: string
  }
  metrics_highlights: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
}

interface UseAIInsightsReturn {
  insights: AIInsights | null
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
    throw new Error('Error al cargar perspectivas ejecutivas')
  }

  return response.json()
}

export function useAIInsights(): UseAIInsightsReturn {
  const { profile, loading, user } = useAuth()
  const [regenerating, setRegenerating] = useState(false)
  
  // Only fetch when auth is complete and we have a valid profile
  const shouldFetch = !loading && user && profile?.tenant_id && profile.role && ['CEO', 'Admin'].includes(profile.role)
  
  const { data, error, mutate } = useSWR(
    shouldFetch ? '/api/ceo/insights' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Don't auto-refresh, insights are cached
    }
  )

  const regenerate = async () => {
    try {
      setRegenerating(true)
      
      const response = await fetch('/api/ceo/insights', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Error al regenerar perspectivas ejecutivas')
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
      console.error('Error al regenerar perspectivas ejecutivas:', error)
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