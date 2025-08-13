"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { format } from "date-fns"

interface AnalyticsFilterContextType {
  // Date range filters
  startDate: Date | null
  endDate: Date | null
  setDateRange: (startDate: Date | null, endDate: Date | null) => void
  
  // Area filters
  selectedAreas: string[]
  setSelectedAreas: (areas: string[]) => void
  
  // Status filter
  selectedStatus: string[]
  setSelectedStatus: (status: string[]) => void
  
  // Priority filter
  selectedPriority: string[]
  setSelectedPriority: (priority: string[]) => void
  
  // Reset all filters
  resetFilters: () => void
  
  // Check if any filters are active
  hasActiveFilters: () => boolean
  
  // Get filter query params for API calls
  getFilterParams: () => Record<string, any>
}

const AnalyticsFilterContext = createContext<AnalyticsFilterContextType | undefined>(undefined)

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedPriority, setSelectedPriority] = useState<string[]>([])

  const setDateRange = (start: Date | null, end: Date | null) => {
    setStartDate(start)
    setEndDate(end)
  }

  const resetFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setSelectedAreas([])
    setSelectedStatus([])
    setSelectedPriority([])
  }

  const hasActiveFilters = () => {
    return !!(
      startDate ||
      endDate ||
      selectedAreas.length > 0 ||
      selectedStatus.length > 0 ||
      selectedPriority.length > 0
    )
  }

  const getFilterParams = () => {
    const params: Record<string, any> = {}
    
    if (startDate) {
      params.startDate = format(startDate, 'yyyy-MM-dd')
    }
    
    if (endDate) {
      params.endDate = format(endDate, 'yyyy-MM-dd')
    }
    
    if (selectedAreas.length > 0) {
      params.areas = selectedAreas.join(',')
    }
    
    if (selectedStatus.length > 0) {
      params.status = selectedStatus.join(',')
    }
    
    if (selectedPriority.length > 0) {
      params.priority = selectedPriority.join(',')
    }
    
    return params
  }

  const value: AnalyticsFilterContextType = {
    startDate,
    endDate,
    setDateRange,
    selectedAreas,
    setSelectedAreas,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    resetFilters,
    hasActiveFilters,
    getFilterParams
  }

  return (
    <AnalyticsFilterContext.Provider value={value}>
      {children}
    </AnalyticsFilterContext.Provider>
  )
}

export function useAnalyticsFilters() {
  const context = useContext(AnalyticsFilterContext)
  if (context === undefined) {
    throw new Error('useAnalyticsFilters must be used within an AnalyticsFilterProvider')
  }
  return context
}