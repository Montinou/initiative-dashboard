"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Calendar, Target, Users, TrendingUp, Filter } from "lucide-react"
import { format, isAfter, isBefore, startOfDay } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { DataTable } from "@/components/blocks/tables/data-table"
import { Objective } from "@/lib/database.types"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"

interface ExtendedObjective extends Objective {
  area_name?: string
  created_by_name?: string
  initiatives_count?: number
  completed_initiatives?: number
  overall_progress?: number
  is_on_track?: boolean
}

interface ObjectivesTableProps {
  data: ExtendedObjective[]
  loading?: boolean
  onEdit?: (objective: ExtendedObjective) => void
  onDelete?: (objective: ExtendedObjective) => void
  onViewDetails?: (objective: ExtendedObjective) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

interface FilterState {
  priority?: string
  status?: string
  dateRange?: {
    from?: Date
    to?: Date
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-black'
    case 'low':
      return 'bg-green-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500 text-white'
    case 'in_progress':
      return 'bg-blue-500 text-white'
    case 'planning':
      return 'bg-yellow-500 text-black'
    case 'overdue':
      return 'bg-red-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

export function ObjectivesTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = [],
  onSelectionChange,
}: ObjectivesTableProps) {
  const [filters, setFilters] = React.useState<FilterState>({})
  
  // Filter data based on current filters
  const filteredData = React.useMemo(() => {
    return data.filter(objective => {
      // Priority filter
      if (filters.priority && objective.priority !== filters.priority) {
        return false
      }
      
      // Status filter
      if (filters.status && objective.status !== filters.status) {
        return false
      }
      
      
      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const targetDate = objective.target_date ? new Date(objective.target_date) : null
        if (!targetDate) return false
        
        if (filters.dateRange.from && isBefore(targetDate, startOfDay(filters.dateRange.from))) {
          return false
        }
        
        if (filters.dateRange.to && isAfter(targetDate, startOfDay(filters.dateRange.to))) {
          return false
        }
      }
      
      return true
    })
  }, [data, filters])

  const columns: ColumnDef<ExtendedObjective>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Objective
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const objective = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span>{objective.title}</span>
            </div>
            {objective.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {objective.description}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "area_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Area
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="font-normal">
            {row.getValue("area_name") || "Organization-wide"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Priority
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string || 'medium'
        return (
          <Badge className={getPriorityColor(priority)}>
            {priority.toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string || 'planning'
        const objective = row.original
        
        return (
          <div className="space-y-1">
            <Badge className={getStatusColor(status)}>
              {status.replace('_', ' ').toUpperCase()}
            </Badge>
            {objective.is_on_track !== undefined && (
              <div className={`text-xs ${objective.is_on_track ? 'text-green-600' : 'text-red-600'}`}>
                {objective.is_on_track ? 'On Track' : 'At Risk'}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "overall_progress",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Progress
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const progress = row.getValue("overall_progress") as number || row.original.progress || 0
        const objective = row.original
        
        return (
          <div className="space-y-2 min-w-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progress}%</span>
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <Progress value={progress} className="h-2" />
            {objective.initiatives_count && (
              <div className="text-xs text-muted-foreground">
                {objective.completed_initiatives || 0}/{objective.initiatives_count} initiatives
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "target_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Target Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const targetDate = row.getValue("target_date") as string
        
        if (!targetDate) return <span className="text-muted-foreground">No target date</span>
        
        const isOverdue = isAfter(new Date(), new Date(targetDate))
        
        return (
          <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : ''}`}>
            <Calendar className="h-3 w-3" />
            <span className="text-sm">
              {format(new Date(targetDate), 'MMM dd, yyyy')}
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const objective = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(objective.id)}
              >
                Copy objective ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(objective)}>
                  View details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(objective)}>
                  Edit objective
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(objective)}
                  className="text-red-600"
                >
                  Delete objective
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-b-0">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select 
          value={filters.priority || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            priority: value === "all" ? undefined : value 
          }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.status || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value === "all" ? undefined : value 
          }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>


        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !filters.dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                      {format(filters.dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange?.from}
                selected={filters.dateRange}
                onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {(filters.priority || filters.status || filters.dateRange) && (
          <Button
            variant="ghost"
            onClick={() => setFilters({})}
            className="h-8 px-2 lg:px-3"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="title"
        showViewOptions={true}
        showPagination={true}
      />
      
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} objective(s) selected
          </span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              Bulk Edit
            </Button>
            <Button size="sm" variant="outline">
              Export Selected
            </Button>
            <Button size="sm" variant="destructive">
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}