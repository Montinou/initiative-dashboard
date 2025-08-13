"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client'

interface QuarterFilterProps {
  selected: string[]
  onChange: (quarterIds: string[]) => void
}

interface Quarter {
  id: string
  quarter_name: string
  start_date: string
  end_date: string
  year: number
}

export function QuarterFilter({ selected, onChange }: QuarterFilterProps) {
  const [quarters, setQuarters] = useState<Quarter[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Fetch quarters from database
  useEffect(() => {
    const fetchQuarters = async () => {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('quarters')
        .select('*')
        .order('start_date', { ascending: false })
      
      if (!error && data) {
        // Add year to each quarter for easier grouping
        const quartersWithYear = data.map(q => ({
          ...q,
          year: new Date(q.start_date).getFullYear()
        }))
        setQuarters(quartersWithYear as Quarter[])
      }
      setLoading(false)
    }

    fetchQuarters()
  }, [])

  // Group quarters by year
  const groupedQuarters = useMemo(() => {
    const groups: Record<number, Quarter[]> = {}
    
    quarters.forEach(quarter => {
      if (!groups[quarter.year]) {
        groups[quarter.year] = []
      }
      groups[quarter.year].push(quarter)
    })
    
    // Sort quarters within each year
    Object.keys(groups).forEach(year => {
      groups[parseInt(year)].sort((a, b) => {
        const orderMap: Record<string, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 }
        return (orderMap[a.quarter_name] || 0) - (orderMap[b.quarter_name] || 0)
      })
    })
    
    return groups
  }, [quarters])

  // Get available years
  const availableYears = useMemo(() => {
    return Object.keys(groupedQuarters)
      .map(year => parseInt(year))
      .sort((a, b) => b - a)
  }, [groupedQuarters])

  // Get selected quarter details
  const selectedQuarters = useMemo(() => {
    return quarters.filter(q => selected.includes(q.id))
  }, [quarters, selected])

  // Get current quarter
  const currentQuarter = useMemo(() => {
    const now = new Date()
    return quarters.find(q => 
      new Date(q.start_date) <= now && new Date(q.end_date) >= now
    )
  }, [quarters])

  const toggleQuarter = (quarterId: string) => {
    if (selected.includes(quarterId)) {
      onChange(selected.filter(id => id !== quarterId))
    } else {
      onChange([...selected, quarterId])
    }
  }

  const selectYear = (year: number) => {
    const yearQuarters = groupedQuarters[year] || []
    const yearIds = yearQuarters.map(q => q.id)
    const newSelection = new Set(selected)
    
    // Check if all quarters of the year are selected
    const allSelected = yearIds.every(id => newSelection.has(id))
    
    if (allSelected) {
      // Deselect all quarters of the year
      yearIds.forEach(id => newSelection.delete(id))
    } else {
      // Select all quarters of the year
      yearIds.forEach(id => newSelection.add(id))
    }
    
    onChange(Array.from(newSelection))
  }

  const clearSelection = () => {
    onChange([])
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    
    return `${start.toLocaleDateString('es', options)} - ${end.toLocaleDateString('es', options)}`
  }

  const getQuarterIcon = (quarterName: string) => {
    const icons: Record<string, string> = {
      'Q1': '🌱', // Spring/Growth
      'Q2': '☀️', // Summer/Sun
      'Q3': '🍂', // Fall/Harvest
      'Q4': '❄️'  // Winter/Year-end
    }
    return icons[quarterName] || '📅'
  }

  const isQuarterActive = (quarter: Quarter) => {
    const now = new Date()
    return new Date(quarter.start_date) <= now && new Date(quarter.end_date) >= now
  }

  const isQuarterPast = (quarter: Quarter) => {
    return new Date(quarter.end_date) < new Date()
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Trimestres</span>
        {selected.length > 0 && (
          <Badge 
            variant="secondary"
            className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
          >
            {selected.length}
          </Badge>
        )}
      </div>

      {/* Trigger Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between p-3 h-auto rounded-xl border transition-all duration-200",
          selected.length > 0
            ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
        )}
      >
        <span className="text-sm">
          {selected.length === 0 
            ? "Seleccionar trimestres" 
            : selectedQuarters.map(q => q.quarter_name).join(', ')
          }
        </span>
        <Calendar className="h-4 w-4" />
      </Button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Year Selector */}
          {availableYears.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear)
                  if (currentIndex < availableYears.length - 1) {
                    setSelectedYear(availableYears[currentIndex + 1])
                  }
                }}
                disabled={selectedYear === availableYears[availableYears.length - 1]}
                className="p-1 hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4 text-white/70" />
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">{selectedYear}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectYear(selectedYear)}
                  className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
                >
                  Seleccionar año
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear)
                  if (currentIndex > 0) {
                    setSelectedYear(availableYears[currentIndex - 1])
                  }
                }}
                disabled={selectedYear === availableYears[0]}
                className="p-1 hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4 text-white/70" />
              </Button>
            </div>
          )}

          {/* Quarters Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-20 text-white/50 text-sm">
              Cargando trimestres...
            </div>
          ) : !groupedQuarters[selectedYear] ? (
            <div className="flex items-center justify-center h-20 text-white/50 text-sm">
              No hay trimestres para {selectedYear}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {groupedQuarters[selectedYear].map((quarter) => {
                const isSelected = selected.includes(quarter.id)
                const isActive = isQuarterActive(quarter)
                const isPast = isQuarterPast(quarter)
                
                return (
                  <Button
                    key={quarter.id}
                    variant="ghost"
                    onClick={() => toggleQuarter(quarter.id)}
                    className={cn(
                      "relative p-3 h-auto rounded-xl border transition-all duration-200",
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                        : isPast
                        ? "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
                    )}
                  >
                    <div className="space-y-2 w-full">
                      {/* Quarter Name with Icon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getQuarterIcon(quarter.quarter_name)}</span>
                          <span className="font-medium">{quarter.quarter_name}</span>
                        </div>
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/30 border border-emerald-400/50">
                            <Check className="h-3 w-3 text-emerald-100" />
                          </div>
                        )}
                      </div>
                      
                      {/* Date Range */}
                      <div className="text-xs text-white/60">
                        {formatDateRange(quarter.start_date, quarter.end_date)}
                      </div>
                      
                      {/* Active Indicator */}
                      {isActive && (
                        <Badge
                          variant="secondary"
                          className="absolute top-1 right-1 bg-green-500/20 text-green-100 border-green-400/30 text-xs px-1.5 py-0"
                        >
                          Actual
                        </Badge>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentQuarter) {
                    onChange([currentQuarter.id])
                  }
                }}
                disabled={!currentQuarter}
                className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
              >
                Trimestre actual
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Select all quarters from current year
                  const currentYearQuarters = quarters.filter(q => q.year === new Date().getFullYear())
                  onChange(currentYearQuarters.map(q => q.id))
                }}
                className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
              >
                Año actual
              </Button>
            </div>
            
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
              >
                Limpiar
              </Button>
            )}
          </div>

          {/* Selected Quarters Summary */}
          {selectedQuarters.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Trimestres seleccionados:</div>
              <div className="flex flex-wrap gap-2">
                {selectedQuarters.map((quarter) => (
                  <Badge
                    key={quarter.id}
                    variant="secondary"
                    className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                  >
                    <span className="text-xs">
                      {quarter.quarter_name} {quarter.year}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}