"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DateRangeFilter } from "./DateRangeFilter"
import { AreaFilter } from "./AreaFilter"
import { ProgressFilter } from "./ProgressFilter"
import { StatusFilter } from "./StatusFilter"
import { PriorityFilter } from "./PriorityFilter"
import { useFilters, type FilterState } from "@/hooks/useFilters"

interface FilterContainerProps {
  onFiltersChange: (filters: FilterState) => void
  className?: string
}

export function FilterContainer({ onFiltersChange, className }: FilterContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { filters, updateFilters, resetFilters, getActiveFilterCount } = useFilters({
    onFiltersChange
  })

  const activeCount = getActiveFilterCount()

  const handleReset = () => {
    resetFilters()
  }

  return (
    <Card className={cn(
      "bg-card border border-border rounded-lg transition-all duration-300",
      className
    )}>
      <CardContent className="p-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground p-2 h-auto"
          >
            <span className="text-lg font-semibold">
              Filtros
            </span>
            {activeCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20">
                {activeCount}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Active Filters Summary (always visible) */}
        {activeCount > 0 && !isExpanded && (
          <div className="flex flex-wrap gap-2 mb-2">
            {(filters.startDate || filters.endDate) && (
              <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-md border border-blue-500/20">
                Fechas: {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Inicio'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'Fin'}
              </div>
            )}
            {filters.areas.length > 0 && (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-md border border-green-500/20">
                Áreas: {filters.areas.length}
              </div>
            )}
            {(filters.progressMin > 0 || filters.progressMax < 100) && (
              <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs px-2 py-1 rounded-md border border-orange-500/20">
                Progreso: {filters.progressMin}%-{filters.progressMax}%
              </div>
            )}
            {filters.statuses.length > 0 && (
              <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs px-2 py-1 rounded-md border border-purple-500/20">
                Estados: {filters.statuses.length}
              </div>
            )}
            {filters.priorities.length > 0 && (
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-md border border-red-500/20">
                Prioridades: {filters.priorities.length}
              </div>
            )}
          </div>
        )}

        {/* Expanded Filter Controls */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <DateRangeFilter
              startDate={filters.startDate ? new Date(filters.startDate) : null}
              endDate={filters.endDate ? new Date(filters.endDate) : null}
              onChange={(startDate, endDate) => updateFilters({ 
                startDate: startDate ? startDate.toISOString().split('T')[0] : null,
                endDate: endDate ? endDate.toISOString().split('T')[0] : null
              })}
            />
            <AreaFilter
              selected={filters.areas}
              onChange={(areas) => updateFilters({ areas })}
            />
            <ProgressFilter
              min={filters.progressMin}
              max={filters.progressMax}
              onChange={(progressMin, progressMax) => updateFilters({ progressMin, progressMax })}
            />
            <StatusFilter
              selected={filters.statuses}
              onChange={(statuses) => updateFilters({ statuses })}
            />
            <PriorityFilter
              selected={filters.priorities}
              onChange={(priorities) => updateFilters({ priorities })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}