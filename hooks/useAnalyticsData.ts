import { useMemo } from 'react'
import useSWR from 'swr'
import { useAnalyticsFilters } from '@/contexts/AnalyticsFilterContext'

export function useAnalyticsData(endpoint: string, additionalParams?: Record<string, any>) {
  const { getFilterParams } = useAnalyticsFilters()
  
  const apiUrl = useMemo(() => {
    const params = {
      ...getFilterParams(),
      ...additionalParams
    }
    const queryString = new URLSearchParams(params).toString()
    return `/api/dashboard/${endpoint}${queryString ? `?${queryString}` : ''}`
  }, [endpoint, getFilterParams, additionalParams])
  
  return useSWR(apiUrl)
}