"use client"

import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'

interface Risk {
  id: string
  initiative_id: string
  initiative_title: string
  area_name: string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  risk_type: 'timeline' | 'resource' | 'budget' | 'quality' | 'scope'
  description: string
  impact_score: number
  probability_score: number
  current_progress: number
  expected_progress: number
  days_behind?: number
  mitigation_status: 'not_started' | 'in_progress' | 'completed'
  owner_name?: string
  due_date: string
}

export function useRiskAnalysis() {
  const { profile } = useAuth()
  
  const { data, error, mutate } = useSWR<Risk[]>(
    profile?.tenant_id ? `/api/ceo/risk-analysis?tenant_id=${profile.tenant_id}` : null,
    async (url: string) => {
      // Try CEO endpoint first
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        // console.log('CEO risk analysis endpoint not available, using fallback')
      }
      
      // Fallback to initiatives API and analyze risks
      const initiativesResponse = await fetch('/api/dashboard/initiatives', {
        method: 'GET',
        credentials: 'include',
      })

      if (!initiativesResponse.ok) {
        return []
      }

      const initiativesData = await initiativesResponse.json()
      const initiatives = initiativesData.initiatives || []

      // Analyze initiatives for risks
      const risks: Risk[] = []
      const today = new Date()

      initiatives.forEach((initiative: any) => {
        // Check if initiative is at risk
        let riskLevel: Risk['risk_level'] = 'low'
        let riskType: Risk['risk_type'] = 'timeline'
        let daysBehind = 0
        let description = ''

        // Calculate expected progress based on timeline
        if (initiative.start_date && initiative.due_date) {
          const startDate = new Date(initiative.start_date)
          const dueDate = new Date(initiative.due_date)
          const totalDays = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          const elapsedDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          const expectedProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
          
          const progressDiff = expectedProgress - (initiative.progress || 0)
          
          if (progressDiff > 30) {
            riskLevel = 'critical'
            daysBehind = Math.floor(progressDiff * totalDays / 100)
            description = `Initiative is ${progressDiff}% behind expected progress`
          } else if (progressDiff > 20) {
            riskLevel = 'high'
            daysBehind = Math.floor(progressDiff * totalDays / 100)
            description = `Initiative showing significant delays`
          } else if (progressDiff > 10) {
            riskLevel = 'medium'
            daysBehind = Math.floor(progressDiff * totalDays / 100)
            description = `Initiative slightly behind schedule`
          }

          // Check if overdue
          if (today > dueDate && initiative.status !== 'completed') {
            riskLevel = 'critical'
            riskType = 'timeline'
            daysBehind = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            description = `Initiative is ${daysBehind} days overdue`
          }

          // Only add if there's a risk
          if (riskLevel !== 'low') {
            risks.push({
              id: `risk-${initiative.id}`,
              initiative_id: initiative.id,
              initiative_title: initiative.title || initiative.name,
              area_name: initiative.area?.name || 'Unknown',
              risk_level: riskLevel,
              risk_type: riskType,
              description: description,
              impact_score: riskLevel === 'critical' ? 9 : riskLevel === 'high' ? 7 : 5,
              probability_score: riskLevel === 'critical' ? 8 : riskLevel === 'high' ? 6 : 4,
              current_progress: initiative.progress || 0,
              expected_progress: expectedProgress,
              days_behind: daysBehind,
              mitigation_status: 'not_started',
              owner_name: initiative.created_by_profile?.full_name || 'Unassigned',
              due_date: initiative.due_date || initiative.target_date
            })
          }
        }
      })

      // Sort risks by severity (impact * probability)
      risks.sort((a, b) => 
        (b.impact_score * b.probability_score) - (a.impact_score * a.probability_score)
      )

      return risks
    },
    {
      refreshInterval: 0, // Refresh every 2 minutes
      revalidateOnFocus: false,
    }
  )

  return {
    risks: data || [],
    loading: !data && !error,
    error,
    mutate
  }
}