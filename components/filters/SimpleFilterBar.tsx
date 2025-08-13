"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  PauseCircle
} from 'lucide-react'
import { EnhancedFilterState, VALID_STATUSES, VALID_PRIORITIES } from '@/lib/types/filters'

interface SimpleFilterBarProps {
  filters: EnhancedFilterState
  onFiltersChange: (filters: Partial<EnhancedFilterState>) => void
  onReset: () => void
  activeFilterCount: number
  entityType?: 'initiatives' | 'objectives' | 'activities'
  showProgressFilter?: boolean
  showStatusFilter?: boolean
  showPriorityFilter?: boolean
  showSearchFilter?: boolean
  className?: string
}

export function SimpleFilterBar({
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
  entityType = 'initiatives',
  showProgressFilter = true,
  showStatusFilter = true,
  showPriorityFilter = false,
  showSearchFilter = true,
  className
}: SimpleFilterBarProps) {
  // Get appropriate status options based on entity type
  const statusOptions = entityType === 'objectives' 
    ? VALID_STATUSES.objectives 
    : entityType === 'activities'
    ? ['completed', 'in_progress'] as const
    : VALID_STATUSES.initiatives

  const statusIcons = {
    planning: Clock,
    in_progress: AlertCircle,
    completed: CheckCircle,
    on_hold: PauseCircle,
    overdue: AlertCircle
  }

  const handleSearch = (value: string) => {
    onFiltersChange({ searchQuery: value })
  }

  const handleProgressChange = (value: number[]) => {
    onFiltersChange({ 
      progressMin: value[0], 
      progressMax: value[1] 
    })
  }

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ statuses: newStatuses })
  }

  const handlePriorityChange = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ priorities: newPriorities })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({ [field]: value || null })
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Filter Row */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Search Input */}
        {showSearchFilter && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={filters.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-900/50 border-white/10"
            />
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="h-4 w-4 mr-2" />
                Dates
                {(filters.startDate || filters.endDate) && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    Active
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-md"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          {showStatusFilter && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Status
                  {filters.statuses.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1">
                      {filters.statuses.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                  {statusOptions.map((status) => {
                    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock
                    return (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={filters.statuses.includes(status)}
                          onChange={() => handleStatusChange(status)}
                          className="rounded border-gray-600"
                        />
                        <Icon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                      </label>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Priority Filter */}
          {showPriorityFilter && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Priority
                  {filters.priorities.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1">
                      {filters.priorities.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3">
                <div className="space-y-2">
                  {VALID_PRIORITIES.map((priority) => (
                    <label
                      key={priority}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.priorities.includes(priority)}
                        onChange={() => handlePriorityChange(priority)}
                        className="rounded border-gray-600"
                      />
                      <span className={cn(
                        "text-sm capitalize",
                        priority === 'high' && "text-red-500",
                        priority === 'medium' && "text-yellow-500",
                        priority === 'low' && "text-green-500"
                      )}>
                        {priority}
                      </span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Progress Filter */}
          {showProgressFilter && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Progress
                  {(filters.progressMin > 0 || filters.progressMax < 100) && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1">
                      {filters.progressMin}-{filters.progressMax}%
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    Progress Range: {filters.progressMin}% - {filters.progressMax}%
                  </div>
                  <Slider
                    value={[filters.progressMin, filters.progressMax]}
                    onValueChange={handleProgressChange}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-red-500 hover:text-red-400"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              "{filters.searchQuery}"
              <X
                className="h-3 w-3 cursor-pointer ml-1"
                onClick={() => onFiltersChange({ searchQuery: '' })}
              />
            </Badge>
          )}
          {(filters.startDate || filters.endDate) && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {filters.startDate || '...'} - {filters.endDate || '...'}
              <X
                className="h-3 w-3 cursor-pointer ml-1"
                onClick={() => onFiltersChange({ startDate: null, endDate: null })}
              />
            </Badge>
          )}
          {filters.statuses.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status.replace('_', ' ')}
              <X
                className="h-3 w-3 cursor-pointer ml-1"
                onClick={() => handleStatusChange(status)}
              />
            </Badge>
          ))}
          {filters.priorities.map(priority => (
            <Badge key={priority} variant="secondary" className="gap-1">
              {priority} priority
              <X
                className="h-3 w-3 cursor-pointer ml-1"
                onClick={() => handlePriorityChange(priority)}
              />
            </Badge>
          ))}
          {(filters.progressMin > 0 || filters.progressMax < 100) && (
            <Badge variant="secondary" className="gap-1">
              Progress: {filters.progressMin}-{filters.progressMax}%
              <X
                className="h-3 w-3 cursor-pointer ml-1"
                onClick={() => onFiltersChange({ progressMin: 0, progressMax: 100 })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}