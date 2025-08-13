"use client"

import React from "react"
import { Filter, RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DateRangeFilter } from "@/components/filters/DateRangeFilter"
import { AreaFilter } from "@/components/filters/AreaFilter"
import { StatusFilter } from "@/components/filters/StatusFilter"
import { PriorityFilter } from "@/components/filters/PriorityFilter"
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext"
import { cn } from "@/lib/utils"

interface AnalyticsFilterSidebarProps {
  onExport?: () => void
  className?: string
  showStatusFilter?: boolean
  showPriorityFilter?: boolean
}

export function AnalyticsFilterSidebar({
  onExport,
  className,
  showStatusFilter = false,
  showPriorityFilter = false
}: AnalyticsFilterSidebarProps) {
  const {
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
    hasActiveFilters
  } = useAnalyticsFilters()

  return (
    <Card className={cn(
      "bg-gray-900/50 backdrop-blur-sm border border-white/10 p-4 space-y-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Filters</span>
        </div>
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChange={setDateRange}
        />

        {/* Area Filter */}
        <AreaFilter
          selected={selectedAreas}
          onChange={setSelectedAreas}
        />

        {/* Status Filter - Optional */}
        {showStatusFilter && (
          <StatusFilter
            selected={selectedStatus}
            onChange={setSelectedStatus}
          />
        )}

        {/* Priority Filter - Optional */}
        {showPriorityFilter && (
          <PriorityFilter
            selected={selectedPriority}
            onChange={setSelectedPriority}
          />
        )}
      </div>

      {/* Export Button */}
      {onExport && (
        <div className="pt-4 border-t border-white/10">
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      )}
    </Card>
  )
}