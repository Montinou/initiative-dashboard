import useSWR from 'swr'
import { useState } from 'react'

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
    throw new Error('Failed to fetch insights')
  }

  return response.json()
}

export function useAIInsights(): UseAIInsightsReturn {
  const [regenerating, setRegenerating] = useState(false)
  
  const { data, error, mutate } = useSWR(
    '/api/ceo/insights',
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
        throw new Error('Failed to regenerate insights')
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
      console.error('Failed to regenerate insights:', error)
      throw error
    } finally {
      setRegenerating(false)
    }
  }

  return {
    insights: data?.insights || null,
    loading: !data && !error,
    error,
    cached: data?.cached || false,
    generatedAt: data?.generated_at || null,
    regenerate,
    regenerating,
  }
}