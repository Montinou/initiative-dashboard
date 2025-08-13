"use client"

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Filter,
  X,
  Search,
  Calendar,
  Users,
  Target,
  ChevronDown,
  RotateCcw,
  Save,
  Sliders,
  CheckCircle,
  AlertCircle,
  Clock,
  PauseCircle
} from 'lucide-react'
import { EnhancedFilterState, VALID_STATUSES, VALID_PRIORITIES } from '@/lib/types/filters'
import { DateRangeFilter } from './DateRangeFilter'
import { Area, UserProfile, Objective, Initiative } from '@/lib/types/data'
import { useAreas } from '@/hooks/useAreas'
import { useUsers } from '@/hooks/useUsers'
import { useObjectives } from '@/hooks/useObjectives'
import { useInitiatives } from '@/hooks/useInitiatives'

interface FilterBarProps {
  filters: EnhancedFilterState
  onFiltersChange: (filters: Partial<EnhancedFilterState>) => void
  onReset: () => void
  activeFilterCount: number
  entityType?: 'initiatives' | 'objectives' | 'activities'
  showProgressFilter?: boolean
  showStatusFilter?: boolean
  showPriorityFilter?: boolean
  showAreaFilter?: boolean
  showAssignedFilter?: boolean
  showObjectiveFilter?: boolean
  showInitiativeFilter?: boolean
  showSearchFilter?: boolean
  showCreatedByFilter?: boolean
  className?: string
}

export function FilterBar({
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount,
  entityType = 'initiatives',
  showProgressFilter = true,
  showStatusFilter = true,
  showPriorityFilter = false,
  showAreaFilter = true,
  showAssignedFilter = false,
  showObjectiveFilter = false,
  showInitiativeFilter = false,
  showSearchFilter = true,
  showCreatedByFilter = false,
  className
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Use hooks to fetch real data for filters
  const { areas, loading: areasLoading } = useAreas()
  const { users, loading: usersLoading } = useUsers()
  const { objectives, loading: objectivesLoading } = useObjectives()
  const { initiatives, loading: initiativesLoading } = useInitiatives()

  // Get appropriate status options based on entity type
  const statusOptions = entityType === 'objectives' 
    ? VALID_STATUSES.objectives 
    : VALID_STATUSES.initiatives

  const statusIcons = {
    planning: Clock,
    in_progress: AlertCircle,
    completed: CheckCircle,
    on_hold: PauseCircle,
    overdue: AlertCircle
  }

  const handleSearch = useCallback((value: string) => {
    onFiltersChange({ searchQuery: value })
  }, [onFiltersChange])

  const handleProgressChange = useCallback((value: number[]) => {
    onFiltersChange({ 
      progressMin: value[0], 
      progressMax: value[1] 
    })
  }, [onFiltersChange])

  const handleStatusToggle = useCallback((status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ statuses: newStatuses })
  }, [filters.statuses, onFiltersChange])

  const handlePriorityToggle = useCallback((priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ priorities: newPriorities })
  }, [filters.priorities, onFiltersChange])

  const handleAreaToggle = useCallback((areaId: string) => {
    const newAreas = filters.areas.includes(areaId)
      ? filters.areas.filter(a => a !== areaId)
      : [...filters.areas, areaId]
    onFiltersChange({ areas: newAreas })
  }, [filters.areas, onFiltersChange])

  const handleAssignedToggle = useCallback((userId: string) => {
    const newAssigned = filters.assignedTo.includes(userId)
      ? filters.assignedTo.filter(u => u !== userId)
      : [...filters.assignedTo, userId]
    onFiltersChange({ assignedTo: newAssigned })
  }, [filters.assignedTo, onFiltersChange])

  const handleObjectiveToggle = useCallback((objectiveId: string) => {
    const newObjectives = filters.objectiveIds.includes(objectiveId)
      ? filters.objectiveIds.filter(o => o !== objectiveId)
      : [...filters.objectiveIds, objectiveId]
    onFiltersChange({ objectiveIds: newObjectives })
  }, [filters.objectiveIds, onFiltersChange])

  const handleInitiativeToggle = useCallback((initiativeId: string) => {
    const newInitiatives = filters.initiativeIds.includes(initiativeId)
      ? filters.initiativeIds.filter(i => i !== initiativeId)
      : [...filters.initiativeIds, initiativeId]
    onFiltersChange({ initiativeIds: newInitiatives })
  }, [filters.initiativeIds, onFiltersChange])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Search Input */}
        {showSearchFilter && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, description..."
              value={filters.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-900/50 border-white/10"
            />
          </div>
        )}

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Filter */}
          <DateRangeFilter
            startDate={filters.startDate}
            endDate={filters.endDate}
            onDateChange={(dates) => onFiltersChange(dates)}
          />

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
                    const Icon = statusIcons[status as keyof typeof statusIcons]
                    return (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={filters.statuses.includes(status)}
                          onChange={() => handleStatusToggle(status)}
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
                  <Target className="h-4 w-4 mr-2" />
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
                        onChange={() => handlePriorityToggle(priority)}
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

          {/* Area Filter */}
          {showAreaFilter && !areasLoading && areas.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Sliders className="h-4 w-4 mr-2" />
                  Areas
                  {filters.areas.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1">
                      {filters.areas.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <Command>
                  <CommandInput placeholder="Search areas..." />
                  <CommandList>
                    <CommandEmpty>No areas found.</CommandEmpty>
                    <CommandGroup>
                      {areas.map((area) => (
                        <CommandItem
                          key={area.id}
                          onSelect={() => handleAreaToggle(area.id)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="checkbox"
                              checked={filters.areas.includes(area.id)}
                              onChange={() => {}}
                              className="rounded border-gray-600"
                            />
                            <span className="flex-1">{area.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Assigned To Filter */}
          {showAssignedFilter && !usersLoading && users.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Users className="h-4 w-4 mr-2" />
                  Assigned
                  {filters.assignedTo.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1">
                      {filters.assignedTo.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => handleAssignedToggle(user.id)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="checkbox"
                              checked={filters.assignedTo.includes(user.id)}
                              onChange={() => {}}
                              className="rounded border-gray-600"
                            />
                            <span className="flex-1">{user.full_name || user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* More Filters Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn(
              "h-4 w-4 mr-2 transition-transform",
              isExpanded && "rotate-180"
            )} />
            More Filters
          </Button>

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

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-lg space-y-4">
          {/* Progress Range Filter */}
          {showProgressFilter && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">
                Progress Range: {filters.progressMin}% - {filters.progressMax}%
              </Label>
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
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Objective Filter */}
          {showObjectiveFilter && !objectivesLoading && objectives.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Filter by Objectives</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {objectives.slice(0, 6).map((objective) => (
                  <label
                    key={objective.id}
                    className="flex items-center gap-2 p-2 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={filters.objectiveIds.includes(objective.id)}
                      onChange={() => handleObjectiveToggle(objective.id)}
                      className="rounded border-gray-600"
                    />
                    <span className="text-sm truncate">{objective.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Initiative Filter */}
          {showInitiativeFilter && !initiativesLoading && initiatives.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Filter by Initiatives</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {initiatives.slice(0, 6).map((initiative) => (
                  <label
                    key={initiative.id}
                    className="flex items-center gap-2 p-2 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={filters.initiativeIds.includes(initiative.id)}
                      onChange={() => handleInitiativeToggle(initiative.id)}
                      className="rounded border-gray-600"
                    />
                    <span className="text-sm truncate">{initiative.title || initiative.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Created By Filter */}
          {showCreatedByFilter && !usersLoading && users.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-gray-400">Created By</Label>
              <Select
                value={filters.assignedTo[0] || "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    onFiltersChange({ assignedTo: [] })
                  } else {
                    onFiltersChange({ assignedTo: [value] })
                  }
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              "{filters.searchQuery}"
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ searchQuery: '' })}
              />
            </Badge>
          )}
          {filters.statuses.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status.replace('_', ' ')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusToggle(status)}
              />
            </Badge>
          ))}
          {filters.priorities.map(priority => (
            <Badge key={priority} variant="secondary" className="gap-1">
              {priority} priority
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handlePriorityToggle(priority)}
              />
            </Badge>
          ))}
          {(filters.progressMin > 0 || filters.progressMax < 100) && (
            <Badge variant="secondary" className="gap-1">
              Progress: {filters.progressMin}-{filters.progressMax}%
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ progressMin: 0, progressMax: 100 })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}