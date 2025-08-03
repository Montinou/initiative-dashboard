"use client"

import React from "react"
import { useAreas } from "@/hooks/useAreas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Target,
  TrendingUp,
  BarChart3,
  ArrowUp,
  ArrowDown,
  MoreVertical
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { CardLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface Objective {
  id: string
  name: string
  progress: number
  target: number
  unit: string
}

interface Area {
  id: string
  name: string
  description: string
  lead: string
  objectives: Objective[]
  overallProgress: number
  initiativeCount: number
  status: "On Track" | "At Risk" | "Behind"
}

function AreaCard({ area }: { area: Area }) {
  const statusConfig = {
    "On Track": "text-green-500 bg-green-500/10 border-green-500/20",
    "At Risk": "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Behind: "text-red-500 bg-red-500/10 border-red-500/20",
  }

  const topObjectives = area.objectives.slice(0, 3)

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl text-white">{area.name}</CardTitle>
            <p className="text-sm text-gray-400">Led by {area.lead}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Area</DropdownMenuItem>
              <DropdownMenuItem>Manage Objectives</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-300">{area.description}</p>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className={statusConfig[area.status]}>
            {area.status}
          </Badge>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{area.objectives.length} Objectives</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{area.initiativeCount} Initiatives</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-white font-medium">{area.overallProgress}%</span>
          </div>
          <Progress value={area.overallProgress} className="h-2" />
        </div>

        {topObjectives.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm font-medium text-gray-300 mb-3">Key Objectives</p>
            <div className="space-y-2">
              {topObjectives.map((objective) => (
                <div key={objective.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 truncate flex-1 mr-2">
                    {objective.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {objective.progress}{objective.unit}
                    </span>
                    <span className="text-sm text-gray-500">/</span>
                    <span className="text-sm text-gray-400">
                      {objective.target}{objective.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AreasPage() {
  const { areas, isLoading, error } = useAreas()

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Users}
          title="Unable to load areas"
          description="There was an error loading your business areas. Please try refreshing the page."
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
        <h1 className="text-3xl font-bold text-white">Business Areas</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <CardLoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const totalObjectives = areas?.reduce((acc: number, area: Area) => acc + area.objectives.length, 0) || 0
  const averageProgress = areas?.length 
    ? Math.round(areas.reduce((acc: number, area: Area) => acc + area.overallProgress, 0) / areas.length)
    : 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Business Areas</h1>
          <p className="text-gray-400 mt-2">
            Monitor performance across your organization's key areas
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Areas</p>
                  <p className="text-2xl font-bold text-white">{areas?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Objectives</p>
                  <p className="text-2xl font-bold text-white">{totalObjectives}</p>
                </div>
                <Target className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Average Progress</p>
                  <p className="text-2xl font-bold text-white">{averageProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Areas at Risk</p>
                  <p className="text-2xl font-bold text-white">
                    {areas?.filter((a: Area) => a.status === "At Risk").length || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Areas Grid */}
        {areas && areas.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {areas.map((area: Area) => (
              <AreaCard key={area.id} area={area} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No business areas defined"
            description="Create your first business area to start organizing objectives"
            action={{
              label: "Create Area",
              onClick: () => console.log("Create area")
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}