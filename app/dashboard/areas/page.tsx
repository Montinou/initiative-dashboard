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
import { ProtectedRoute } from "@/components/protected-route"

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

  // Ensure area and objectives are properly defined
  if (!area) {
    console.error('AreaCard: area is undefined')
    return null
  }

  // Ensure objectives is always an array
  const objectives = Array.isArray(area.objectives) ? area.objectives : []
  const topObjectives = objectives.slice(0, 3)

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl text-white">{area.name || 'Unnamed Area'}</CardTitle>
            <p className="text-sm text-gray-400">Led by {area.lead || 'Unassigned'}</p>
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
        <p className="text-sm text-gray-300">{area.description || 'No description available'}</p>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className={statusConfig[area.status || "Behind"]}>
            {area.status || "Behind"}
          </Badge>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{objectives.length} Objectives</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{area.initiativeCount || 0} Initiatives</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-white font-medium">{area.overallProgress || 0}%</span>
          </div>
          <Progress value={area.overallProgress || 0} className="h-2" />
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
  const { areas: rawAreas, loading, error } = useAreas({ includeStats: true })
  
  // Log areas data for debugging if needed
  React.useEffect(() => {
    if (rawAreas && process.env.NODE_ENV === 'development') {
      console.log('📊 Areas loaded:', rawAreas.length, 'areas')
    }
  }, [rawAreas])
  
  // Transform API data to match component expectations
  const areas: Area[] = rawAreas?.map((rawArea: any) => {
    // Ensure we have a valid rawArea object
    if (!rawArea || typeof rawArea !== 'object') {
      console.warn('Invalid rawArea data:', rawArea)
      return null
    }
    
    const transformedArea = {
      id: rawArea.id || `area-${Math.random()}`,
      name: rawArea.name || 'Unnamed Area',
      description: rawArea.description || '',
      lead: rawArea.user_profiles?.full_name || 'Unassigned',
      objectives: [], // No objectives data available from areas API - always empty array
      overallProgress: rawArea.stats?.averageProgress || 0, // Use averageProgress from API
      initiativeCount: rawArea.stats?.total || 0,
      status: getAreaStatus(rawArea.stats)
    }
    
    // Log transformation in development mode only
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${rawArea.name}: ${transformedArea.initiativeCount} initiatives, ${transformedArea.overallProgress}% progress`)
    }
    
    return transformedArea
  }).filter(Boolean) as Area[] || []
  
  // Helper function to determine area status
  function getAreaStatus(stats: any): "On Track" | "At Risk" | "Behind" {
    if (!stats || stats.total === 0) return "Behind"
    
    // Use averageProgress from API instead of calculating from status counts
    const avgProgress = stats.averageProgress || 0
    
    if (avgProgress >= 70) return "On Track"
    if (avgProgress >= 40) return "At Risk"
    return "Behind"
  }

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

  if (loading) {
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

  const totalInitiatives = areas?.reduce((acc: number, area: Area) => acc + (area.initiativeCount || 0), 0) || 0
  const averageProgress = areas?.length 
    ? Math.round(areas.reduce((acc: number, area: Area) => acc + (area.overallProgress || 0), 0) / areas.length)
    : 0

  return (
    <ProtectedRoute requiredRole={['CEO', 'Admin']}>
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
                  <p className="text-sm text-gray-400">Total Initiatives</p>
                  <p className="text-2xl font-bold text-white">{totalInitiatives}</p>
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
            {areas.map((area: Area) => {
              // Additional safety check before rendering
              if (!area || !area.id) {
                console.warn('Skipping invalid area:', area)
                return null
              }
              return <AreaCard key={area.id} area={area} />
            }).filter(Boolean)}
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
    </ProtectedRoute>
  )
}