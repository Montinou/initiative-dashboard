"use client"

import React from "react"
import { useInitiatives } from "@/hooks/useInitiatives"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
  MoreHorizontal,
  Plus
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { TableLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Initiative {
  id: string
  name: string
  progress: number
  status: "planning" | "in_progress" | "completed" | "on_hold"
  owner: string
  dueDate: string
  area: string
  priority: "high" | "medium" | "low" | "High" | "Medium" | "Low"
  description?: string
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  // Provide safe fallbacks for all initiative properties
  const safeInitiative = {
    name: initiative?.name || 'Untitled Initiative',
    status: initiative?.status || 'planning',
    priority: initiative?.priority || 'medium',
    progress: initiative?.progress || 0,
    area: initiative?.area || 'Unknown Area',
    owner: initiative?.owner || 'Unassigned',
    dueDate: initiative?.dueDate || 'No date set',
    description: initiative?.description || ''
  }

  // Map database status values to display status
  const statusMapping = {
    'planning': 'Active',
    'in_progress': 'Active', 
    'completed': 'Completed',
    'on_hold': 'On Hold'
  }

  const statusConfig = {
    Active: { color: "text-blue-500", icon: Clock },
    Completed: { color: "text-green-500", icon: CheckCircle2 },
    "At Risk": { color: "text-red-500", icon: AlertTriangle },
    "On Hold": { color: "text-gray-500", icon: Clock },
  }

  const priorityConfig = {
    High: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Low: "bg-green-500/10 text-green-500 border-green-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  // Map database status to display status, with fallback
  const displayStatus = statusMapping[safeInitiative.status as keyof typeof statusMapping] || 'Active'
  const StatusIcon = statusConfig[displayStatus]?.icon || Clock

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white">{safeInitiative.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{safeInitiative.area}</span>
              <span>•</span>
              <span>{safeInitiative.owner}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {safeInitiative.description && (
          <p className="text-sm text-gray-400">{safeInitiative.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", statusConfig[displayStatus]?.color || "text-blue-500")} />
            <span className="text-sm text-gray-300">{displayStatus}</span>
          </div>
          <Badge variant="outline" className={priorityConfig[safeInitiative.priority] || priorityConfig.medium}>
            {safeInitiative.priority} Priority
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{safeInitiative.progress}%</span>
          </div>
          <Progress value={safeInitiative.progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>Due {safeInitiative.dueDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InitiativesPage() {
  const { initiatives, isLoading, error } = useInitiatives()

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load initiatives"
          description="There was an error loading your initiatives. Please try refreshing the page."
          action={{
            label: "Refresh",
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Initiatives</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  const activeInitiatives = initiatives?.filter((i: Initiative) => 
    i.status === "in_progress" || i.status === "planning" || i.status === "Active"
  ) || []
  const completedInitiatives = initiatives?.filter((i: Initiative) => 
    i.status === "completed" || i.status === "Completed"
  ) || []
  const atRiskInitiatives = initiatives?.filter((i: Initiative) => 
    i.status === "on_hold" || i.status === "At Risk"
  ) || []

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Initiatives</h1>
            <p className="text-gray-400 mt-2">
              Manage and track your strategic initiatives
            </p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Initiative
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm border border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-white">{activeInitiatives.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 backdrop-blur-sm border border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-white">{completedInitiatives.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 backdrop-blur-sm border border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">At Risk</p>
                  <p className="text-2xl font-bold text-white">{atRiskInitiatives.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Initiatives Grid */}
        {initiatives && initiatives.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {initiatives.map((initiative: Initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Zap}
            title="No initiatives yet"
            description="Create your first initiative to start tracking progress"
            action={{
              label: "Create Initiative",
              onClick: () => console.log("Create initiative")
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}