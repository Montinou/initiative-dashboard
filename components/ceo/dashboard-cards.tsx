"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  Activity,
  Building2,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ElementType
  progress?: number
  status?: 'success' | 'warning' | 'error' | 'info'
  className?: string
  href?: string
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  progress,
  status = 'info',
  className,
  href
}: MetricCardProps) {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-red-500 bg-red-500/10',
    info: 'text-blue-500 bg-blue-500/10'
  }

  const CardWrapper = href ? Link : 'div'
  const cardProps = href ? { href } : {}

  return (
    <CardWrapper {...cardProps}>
      <Card className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg",
        href && "cursor-pointer hover:scale-[1.02]",
        className
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{value}</span>
                {trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    trend.isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {trend.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(trend.value)}%</span>
                  </div>
                )}
              </div>
            </div>
            {Icon && (
              <div className={cn(
                "rounded-lg p-2",
                statusColors[status]
              )}>
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>
          {description && (
            <CardDescription className="text-xs mt-1">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        {progress !== undefined && (
          <CardContent>
            <Progress value={progress} className="h-1" />
          </CardContent>
        )}
      </Card>
    </CardWrapper>
  )
}

interface AreaCardProps {
  area: {
    id: string
    name: string
    manager?: string
    totalInitiatives: number
    completedInitiatives: number
    averageProgress: number
    atRisk: number
    teamMembers: number
  }
  onViewDetails?: () => void
}

export function AreaCard({ area, onViewDetails }: AreaCardProps) {
  const completionRate = area.totalInitiatives > 0 
    ? Math.round((area.completedInitiatives / area.totalInitiatives) * 100)
    : 0

  const status = area.atRisk === 0 ? 'success' : area.atRisk < 3 ? 'warning' : 'error'
  const statusIcon = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle
  }[status]
  const StatusIcon = statusIcon

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {area.name}
            </CardTitle>
            {area.manager && (
              <CardDescription className="text-xs mt-1">
                Manager: {area.manager}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/areas/${area.id}/analytics`}>
                  View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/areas/${area.id}/team`}>
                  Manage Team
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{area.averageProgress}%</span>
          </div>
          <Progress value={area.averageProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Initiatives</p>
            <p className="text-sm font-medium">
              {area.completedInitiatives}/{area.totalInitiatives}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Completion</p>
            <p className="text-sm font-medium">{completionRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Team Size</p>
            <p className="text-sm font-medium">{area.teamMembers}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="flex items-center gap-1">
              <StatusIcon className={cn(
                "h-3 w-3",
                status === 'success' && "text-green-500",
                status === 'warning' && "text-yellow-500",
                status === 'error' && "text-red-500"
              )} />
              <span className={cn(
                "text-sm font-medium",
                status === 'success' && "text-green-500",
                status === 'warning' && "text-yellow-500",
                status === 'error' && "text-red-500"
              )}>
                {area.atRisk === 0 ? 'On Track' : `${area.atRisk} At Risk`}
              </span>
            </div>
          </div>
        </div>

        {/* View Details Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewDetails}
        >
          View Area Details
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

interface ObjectiveCardProps {
  objective: {
    id: string
    title: string
    description?: string
    area?: string
    progress: number
    initiativeCount: number
    targetDate?: string
    status?: 'on-track' | 'at-risk' | 'completed' | 'overdue'
  }
}

export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  const statusConfig = {
    'on-track': { color: 'text-green-500', bg: 'bg-green-500/10', label: 'On Track' },
    'at-risk': { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'At Risk' },
    'completed': { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Completed' },
    'overdue': { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Overdue' }
  }

  const status = objective.status || 'on-track'
  const config = statusConfig[status]

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Badge className={cn(config.bg, config.color, "border-0")}>
            {config.label}
          </Badge>
        </div>
        <CardTitle className="text-base mt-2">{objective.title}</CardTitle>
        {objective.description && (
          <CardDescription className="text-xs line-clamp-2">
            {objective.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{objective.progress}%</span>
          </div>
          <Progress value={objective.progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {objective.initiativeCount} Initiative{objective.initiativeCount !== 1 ? 's' : ''}
          </span>
          {objective.targetDate && (
            <span className="text-muted-foreground">
              Due: {new Date(objective.targetDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {objective.area && (
          <Badge variant="outline" className="text-xs">
            {objective.area}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

interface InitiativeCardProps {
  initiative: {
    id: string
    title: string
    area: string
    progress: number
    status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
    dueDate?: string
    owner?: string
    activityCount?: number
    completedActivities?: number
  }
}

export function InitiativeCard({ initiative }: InitiativeCardProps) {
  const statusConfig = {
    planning: { variant: 'secondary' as const, label: 'Planning' },
    in_progress: { variant: 'default' as const, label: 'In Progress' },
    completed: { variant: 'default' as const, label: 'Completed' },
    on_hold: { variant: 'outline' as const, label: 'On Hold' }
  }

  const config = statusConfig[initiative.status]
  const activityProgress = initiative.activityCount && initiative.completedActivities
    ? `${initiative.completedActivities}/${initiative.activityCount} activities`
    : null

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        </div>
        <CardTitle className="text-base mt-2 line-clamp-1">
          {initiative.title}
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {initiative.area}
          </Badge>
          {initiative.owner && (
            <span className="text-xs text-muted-foreground">
              • {initiative.owner}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{initiative.progress}%</span>
          </div>
          <Progress value={initiative.progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {activityProgress && <span>{activityProgress}</span>}
          {initiative.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(initiative.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ActivityCardProps {
  activity: {
    id: string
    title: string
    initiative: string
    assignedTo?: string
    isCompleted: boolean
    dueDate?: string
    priority?: 'low' | 'medium' | 'high'
  }
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const priorityConfig = {
    low: { color: 'text-blue-500', bg: 'bg-blue-500/10' },
    medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    high: { color: 'text-red-500', bg: 'bg-red-500/10' }
  }

  const priority = activity.priority || 'medium'
  const config = priorityConfig[priority]

  return (
    <Card className={cn(
      "hover:shadow-lg transition-all",
      activity.isCompleted && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-4 w-4 rounded-full border-2",
              activity.isCompleted
                ? "bg-primary border-primary"
                : "border-muted-foreground"
            )}>
              {activity.isCompleted && (
                <CheckCircle className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <CardTitle className={cn(
              "text-sm",
              activity.isCompleted && "line-through"
            )}>
              {activity.title}
            </CardTitle>
          </div>
          {!activity.isCompleted && (
            <Badge className={cn(config.bg, config.color, "border-0 text-xs")}>
              {priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Initiative: {activity.initiative}
        </div>
        <div className="flex items-center justify-between text-xs">
          {activity.assignedTo && (
            <span className="text-muted-foreground">
              Assigned to: {activity.assignedTo}
            </span>
          )}
          {activity.dueDate && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(activity.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}