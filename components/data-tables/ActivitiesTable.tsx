"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, CheckCircle2, Circle, User, Calendar, AlertTriangle } from "lucide-react"
import { format, isAfter, differenceInDays } from "date-fns"

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
import { DataTable } from "@/components/blocks/tables/data-table"
import { Activity } from "@/lib/database.types"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ExtendedActivity extends Activity {
  initiative_title?: string
  assigned_to_name?: string
  area_name?: string
  is_overdue?: boolean
  days_overdue?: number
  priority?: 'high' | 'medium' | 'low'
}

interface ActivitiesTableProps {
  data: ExtendedActivity[]
  loading?: boolean
  onEdit?: (activity: ExtendedActivity) => void
  onDelete?: (activity: ExtendedActivity) => void
  onToggleCompletion?: (activity: ExtendedActivity) => void
  onAssign?: (activity: ExtendedActivity, userId: string) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  availableUsers?: Array<{ id: string; name: string }>
}

interface FilterState {
  status?: 'all' | 'completed' | 'pending'
  assignee?: string
  initiative?: string
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function ActivitiesTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onToggleCompletion,
  onAssign,
  selectedIds = [],
  onSelectionChange,
  availableUsers = [],
}: ActivitiesTableProps) {
  const [filters, setFilters] = React.useState<FilterState>({})
  
  // Filter data based on current filters
  const filteredData = React.useMemo(() => {
    return data.filter(activity => {
      // Status filter
      if (filters.status === 'completed' && !activity.is_completed) {
        return false
      }
      if (filters.status === 'pending' && activity.is_completed) {
        return false
      }
      
      // Assignee filter
      if (filters.assignee && filters.assignee !== 'all' && activity.assigned_to !== filters.assignee) {
        return false
      }
      
      // Initiative filter
      if (filters.initiative && filters.initiative !== 'all' && activity.initiative_id !== filters.initiative) {
        return false
      }
      
      return true
    })
  }, [data, filters])

  // Get unique initiatives for filter
  const uniqueInitiatives = React.useMemo(() => {
    const initiatives = new Map()
    data.forEach(activity => {
      if (activity.initiative_id && activity.initiative_title) {
        initiatives.set(activity.initiative_id, activity.initiative_title)
      }
    })
    return Array.from(initiatives.entries()).map(([id, title]) => ({ id, title }))
  }, [data])

  const columns: ColumnDef<ExtendedActivity>[] = [
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
      accessorKey: "is_completed",
      header: "Status",
      cell: ({ row }) => {
        const activity = row.original
        const isCompleted = activity.is_completed

        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto"
              onClick={() => onToggleCompletion?.(activity)}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </Button>
            <span className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
              {isCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
        )
      },
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
            Activity
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const activity = row.original
        return (
          <div className="space-y-1">
            <div className={`font-medium ${activity.is_completed ? 'line-through text-muted-foreground' : ''}`}>
              {activity.title}
            </div>
            {activity.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {activity.description}
              </div>
            )}
            {activity.priority && (
              <Badge variant="outline" className={getPriorityColor(activity.priority)}>
                {activity.priority.toUpperCase()}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "initiative_title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Initiative
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const initiativeTitle = row.getValue("initiative_title") as string
        const activity = row.original
        
        return (
          <div className="space-y-1">
            <Badge variant="secondary" className="font-normal">
              {initiativeTitle || "Unknown Initiative"}
            </Badge>
            {activity.area_name && (
              <div className="text-xs text-muted-foreground">
                {activity.area_name}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "assigned_to_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Assigned To
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const assignedToName = row.getValue("assigned_to_name") as string
        const activity = row.original
        
        if (!assignedToName) {
          return (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unassigned</span>
            </div>
          )
        }
        
        return (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-sm">{assignedToName}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at") as string
        const activity = row.original
        
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
            {activity.is_overdue && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">
                  {activity.days_overdue} days overdue
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const activity = row.original

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
                onClick={() => navigator.clipboard.writeText(activity.id)}
              >
                Copy activity ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onToggleCompletion && (
                <DropdownMenuItem onClick={() => onToggleCompletion(activity)}>
                  {activity.is_completed ? 'Mark as Pending' : 'Mark as Complete'}
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(activity)}>
                  Edit activity
                </DropdownMenuItem>
              )}
              {availableUsers.length > 0 && onAssign && (
                <DropdownMenuSeparator />
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(activity)}
                  className="text-red-600"
                >
                  Delete activity
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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select 
          value={filters.status || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value === "all" ? undefined : value as any
          }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.assignee || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            assignee: value === "all" ? undefined : value 
          }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueInitiatives.length > 0 && (
          <Select 
            value={filters.initiative || "all"} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              initiative: value === "all" ? undefined : value 
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Initiative" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Initiatives</SelectItem>
              {uniqueInitiatives.map((initiative) => (
                <SelectItem key={initiative.id} value={initiative.id}>
                  {initiative.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(filters.status || filters.assignee || filters.initiative) && (
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
            {selectedIds.length} activity(ies) selected
          </span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              Bulk Complete
            </Button>
            <Button size="sm" variant="outline">
              Bulk Assign
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