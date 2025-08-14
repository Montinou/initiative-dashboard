"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, User, Mail, Phone, Shield, Calendar, Users } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/blocks/tables/data-table"
import { UserProfile } from "@/lib/database.types"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ExtendedUserProfile extends UserProfile {
  area_name?: string
  assigned_activities?: number
  completed_activities?: number
  active_initiatives?: number
  performance_score?: number
  last_activity?: string
}

interface TeamsTableProps {
  data: ExtendedUserProfile[]
  loading?: boolean
  onEdit?: (user: ExtendedUserProfile) => void
  onDelete?: (user: ExtendedUserProfile) => void
  onToggleStatus?: (user: ExtendedUserProfile) => void
  onViewProfile?: (user: ExtendedUserProfile) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  availableAreas?: Array<{ id: string; name: string }>
  currentUserRole?: string
}

interface FilterState {
  role?: string
  area?: string
  status?: 'all' | 'active' | 'inactive'
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'CEO':
      return 'bg-purple-500 text-white'
    case 'Admin':
      return 'bg-blue-500 text-white'
    case 'Manager':
      return 'bg-green-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

const getPerformanceColor = (score: number) => {
  if (score >= 90) return 'text-green-600'
  if (score >= 75) return 'text-blue-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function TeamsTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewProfile,
  selectedIds = [],
  onSelectionChange,
  availableAreas = [],
  currentUserRole = 'Manager',
}: TeamsTableProps) {
  const [filters, setFilters] = React.useState<FilterState>({})
  
  // Filter data based on current filters
  const filteredData = React.useMemo(() => {
    return data.filter(user => {
      // Role filter
      if (filters.role && filters.role !== 'all' && user.role !== filters.role) {
        return false
      }
      
      // Area filter
      if (filters.area && filters.area !== 'all' && user.area_id !== filters.area) {
        return false
      }
      
      // Status filter
      if (filters.status === 'active' && !user.is_active) {
        return false
      }
      if (filters.status === 'inactive' && user.is_active) {
        return false
      }
      
      return true
    })
  }, [data, filters])

  const canEditUser = (user: ExtendedUserProfile) => {
    if (currentUserRole === 'CEO') return true
    if (currentUserRole === 'Admin') return user.role !== 'CEO'
    return false
  }

  const columns: ColumnDef<ExtendedUserProfile>[] = [
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
      accessorKey: "full_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            User
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const user = row.original
        const initials = user.full_name
          ?.split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase() || user.email?.substring(0, 2).toUpperCase()
        
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.full_name || "No name"}</div>
              <div className="text-sm text-muted-foreground flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                {user.email}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "role",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Role
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const role = row.getValue("role") as string
        const user = row.original
        
        return (
          <div className="space-y-1">
            <Badge className={getRoleColor(role)}>
              <Shield className="h-3 w-3 mr-1" />
              {role}
            </Badge>
            {user.is_system_admin && (
              <Badge variant="outline" className="text-xs">
                System Admin
              </Badge>
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
        const areaName = row.getValue("area_name") as string
        return areaName ? (
          <Badge variant="outline" className="font-normal">
            {areaName}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No area assigned</span>
        )
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original
        const isActive = user.is_active
        
        return (
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            {onToggleStatus && canEditUser(user) && (
              <Switch
                checked={isActive}
                onCheckedChange={() => onToggleStatus(user)}
                size="sm"
              />
            )}
          </div>
        )
      },
    },
    {
      id: "performance",
      header: "Performance",
      cell: ({ row }) => {
        const user = row.original
        
        return (
          <div className="space-y-1 min-w-[100px]">
            {user.performance_score !== undefined && (
              <div className={`text-sm font-medium ${getPerformanceColor(user.performance_score)}`}>
                {user.performance_score}% Score
              </div>
            )}
            {user.assigned_activities !== undefined && (
              <div className="text-xs text-muted-foreground">
                {user.completed_activities || 0}/{user.assigned_activities} activities
              </div>
            )}
            {user.active_initiatives !== undefined && (
              <div className="text-xs text-muted-foreground flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {user.active_initiatives} initiatives
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "last_login",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Last Login
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const lastLogin = row.getValue("last_login") as string
        const user = row.original
        
        return (
          <div className="space-y-1">
            {lastLogin ? (
              <div className="flex items-center space-x-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(lastLogin), 'MMM dd, yyyy')}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Never</span>
            )}
            {user.phone && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{user.phone}</span>
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
        const user = row.original
        const canEdit = canEditUser(user)

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
                onClick={() => navigator.clipboard.writeText(user.email)}
              >
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewProfile && (
                <DropdownMenuItem onClick={() => onViewProfile(user)}>
                  View profile
                </DropdownMenuItem>
              )}
              {onEdit && canEdit && (
                <DropdownMenuItem onClick={() => onEdit(user)}>
                  Edit user
                </DropdownMenuItem>
              )}
              {onToggleStatus && canEdit && (
                <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                  {user.is_active ? 'Deactivate' : 'Activate'} user
                </DropdownMenuItem>
              )}
              {onDelete && canEdit && user.role !== 'CEO' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(user)}
                    className="text-red-600"
                  >
                    Delete user
                  </DropdownMenuItem>
                </>
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
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
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
          value={filters.role || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            role: value === "all" ? undefined : value 
          }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="CEO">CEO</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.area || "all"} 
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            area: value === "all" ? undefined : value 
          }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {availableAreas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {(filters.role || filters.area || filters.status) && (
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
        searchKey="full_name"
        showViewOptions={true}
        showPagination={true}
      />
      
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} user(s) selected
          </span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              Bulk Edit
            </Button>
            <Button size="sm" variant="outline">
              Export Selected
            </Button>
            <Button size="sm" variant="outline">
              Send Invitations
            </Button>
            {currentUserRole === 'CEO' && (
              <Button size="sm" variant="destructive">
                Deactivate Selected
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}