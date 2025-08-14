"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Calendar, User, Target, TrendingUp } from "lucide-react"
import { format } from "date-fns"

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
import { Initiative } from "@/lib/database.types"

interface ExtendedInitiative extends Initiative {
  area_name?: string
  created_by_name?: string
  activities_count?: number
  completed_activities?: number
  is_overdue?: boolean
  days_remaining?: number
}

interface InitiativesTableProps {
  data: ExtendedInitiative[]
  loading?: boolean
  onEdit?: (initiative: ExtendedInitiative) => void
  onDelete?: (initiative: ExtendedInitiative) => void
  onViewDetails?: (initiative: ExtendedInitiative) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500 text-white'
    case 'in_progress':
      return 'bg-blue-500 text-white'
    case 'planning':
      return 'bg-yellow-500 text-black'
    case 'on_hold':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

const getProgressColor = (progress: number) => {
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

export function InitiativesTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = [],
  onSelectionChange,
}: InitiativesTableProps) {
  const columns: ColumnDef<ExtendedInitiative>[] = [
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
            Initiative
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const initiative = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{initiative.title}</div>
            {initiative.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {initiative.description}
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
            {row.getValue("area_name") || "Unassigned"}
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
        const status = row.getValue("status") as string
        return (
          <Badge className={getStatusColor(status)}>
            {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
          </Badge>
        )
      },
    },
    {
      accessorKey: "progress",
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
        const progress = row.getValue("progress") as number || 0
        const initiative = row.original
        
        return (
          <div className="space-y-2 min-w-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progress}%</span>
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
            <Progress value={progress} className="h-2" />
            {initiative.activities_count && (
              <div className="text-xs text-muted-foreground">
                {initiative.completed_activities || 0}/{initiative.activities_count} activities
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Due Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const dueDate = row.getValue("due_date") as string
        const initiative = row.original
        
        if (!dueDate) return <span className="text-muted-foreground">No due date</span>
        
        const isOverdue = initiative.is_overdue
        const daysRemaining = initiative.days_remaining
        
        return (
          <div className="space-y-1">
            <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="h-3 w-3" />
              <span className="text-sm">
                {format(new Date(dueDate), 'MMM dd, yyyy')}
              </span>
            </div>
            {daysRemaining !== undefined && (
              <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                {isOverdue 
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days remaining`
                }
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_by_name",
      header: "Owner",
      cell: ({ row }) => {
        const ownerName = row.getValue("created_by_name") as string
        return (
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{ownerName || "Unknown"}</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const initiative = row.original

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
                onClick={() => navigator.clipboard.writeText(initiative.id)}
              >
                Copy initiative ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(initiative)}>
                  View details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(initiative)}>
                  Edit initiative
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(initiative)}
                  className="text-red-600"
                >
                  Delete initiative
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
      <DataTable
        columns={columns}
        data={data}
        searchKey="title"
        showViewOptions={true}
        showPagination={true}
      />
      
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} initiative(s) selected
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