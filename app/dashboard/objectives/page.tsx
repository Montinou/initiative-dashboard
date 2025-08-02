"use client"

import React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Plus,
  MoreHorizontal,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { TableLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { swrConfig } from "@/lib/swr-config"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Objective {
  id: string
  name: string
  description: string
  area: string
  owner: string
  current: number
  target: number
  unit: string
  progress: number
  status: "On Track" | "At Risk" | "Behind" | "Completed"
  dueDate: string
  lastUpdated: string
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const statusConfig = {
    "On Track": "text-green-500 bg-green-500/10 border-green-500/20",
    "At Risk": "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Behind: "text-red-500 bg-red-500/10 border-red-500/20",
    Completed: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  }

  const progressPercentage = objective.target > 0 
    ? Math.min((objective.current / objective.target) * 100, 100)
    : 0

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-lg text-white">{objective.name}</CardTitle>
            <p className="text-sm text-gray-400">{objective.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{objective.area}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span>{objective.owner}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit Objective</DropdownMenuItem>
              <DropdownMenuItem>Update Progress</DropdownMenuItem>
              <DropdownMenuItem>View History</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={statusConfig[objective.status]}>
            {objective.status}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>Due {new Date(objective.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">
              {objective.current}{objective.unit} / {objective.target}{objective.unit}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {progressPercentage.toFixed(1)}% complete
            </span>
            <span className="text-gray-500">
              Last updated {new Date(objective.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ObjectivesPage() {
  const { data, error, isLoading } = useSWR(
    "/api/dashboard/objectives",
    swrConfig.fetcher
  )

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Target}
          title="Unable to load objectives"
          description="There was an error loading your objectives. Please try refreshing the page."
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
          <h1 className="text-3xl font-bold text-white">Objectives</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  const objectives: Objective[] = data?.data || []

  // Calculate statistics
  const totalObjectives = objectives.length
  const completedObjectives = objectives.filter(obj => obj.status === "Completed").length
  const onTrackObjectives = objectives.filter(obj => obj.status === "On Track").length
  const atRiskObjectives = objectives.filter(obj => obj.status === "At Risk").length
  const behindObjectives = objectives.filter(obj => obj.status === "Behind").length

  const averageProgress = totalObjectives > 0
    ? Math.round(objectives.reduce((sum, obj) => {
        const progress = obj.target > 0 ? (obj.current / obj.target) * 100 : 0
        return sum + Math.min(progress, 100)
      }, 0) / totalObjectives)
    : 0

  // Group by area
  const objectivesByArea = objectives.reduce((acc, obj) => {
    if (!acc[obj.area]) acc[obj.area] = []
    acc[obj.area].push(obj)
    return acc
  }, {} as Record<string, Objective[]>)

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Objectives</h1>
            <p className="text-gray-400 mt-2">
              Track and manage key performance objectives across all areas
            </p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-white">{totalObjectives}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 backdrop-blur-sm border border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">On Track</p>
                  <p className="text-2xl font-bold text-white">{onTrackObjectives}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm border border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-white">{completedObjectives}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 backdrop-blur-sm border border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">At Risk</p>
                  <p className="text-2xl font-bold text-white">{atRiskObjectives}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Progress</p>
                  <p className="text-2xl font-bold text-white">{averageProgress}%</p>
                </div>
                <div className="flex items-center">
                  <ArrowUp className="h-8 w-8 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Objectives by Area */}
        {objectives.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(objectivesByArea).map(([area, areaObjectives]) => (
              <div key={area} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">{area}</h2>
                  <Badge variant="outline" className="text-gray-300">
                    {areaObjectives.length} objectives
                  </Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {areaObjectives.map((objective) => (
                    <ObjectiveCard key={objective.id} objective={objective} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No objectives yet"
            description="Create your first objective to start tracking key performance indicators"
            action={{
              label: "Create Objective",
              onClick: () => console.log("Create objective")
            }}
          />
        )}

        {/* Quick Actions */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start bg-white/5 border-white/10 hover:bg-white/10">
                <Plus className="h-4 w-4 mr-2" />
                Add New Objective
              </Button>
              <Button variant="outline" className="justify-start bg-white/5 border-white/10 hover:bg-white/10">
                <TrendingUp className="h-4 w-4 mr-2" />
                Update Progress
              </Button>
              <Button variant="outline" className="justify-start bg-white/5 border-white/10 hover:bg-white/10">
                <Calendar className="h-4 w-4 mr-2" />
                Review Deadlines
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}