"use client"

import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Building2,
  Target,
  Activity,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  BarChart3,
  PieChart
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ObjectiveCard, InitiativeCard, ActivityCard } from "./dashboard-cards"
import { LineChartBlock, PieChartBlock, BarChartBlock } from "@/components/blocks/charts"

interface AreaData {
  id: string
  name: string
  manager?: string
  description?: string
  totalInitiatives: number
  completedInitiatives: number
  inProgressInitiatives: number
  averageProgress: number
  atRisk: number
  teamMembers: number
  objectives?: Array<{
    id: string
    title: string
    description?: string
    progress: number
    initiativeCount: number
    targetDate?: string
    status?: 'on-track' | 'at-risk' | 'completed' | 'overdue'
  }>
  initiatives?: Array<{
    id: string
    title: string
    area: string
    progress: number
    status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
    dueDate?: string
    owner?: string
    activityCount?: number
    completedActivities?: number
  }>
  activities?: Array<{
    id: string
    title: string
    initiative: string
    assignedTo?: string
    isCompleted: boolean
    dueDate?: string
    priority?: 'low' | 'medium' | 'high'
  }>
  progressTrend?: Array<{
    date: string
    progress: number
  }>
  teamPerformance?: Array<{
    member: string
    completedTasks: number
    pendingTasks: number
  }>
}

interface AreaTabsProps {
  areas: AreaData[]
  loading?: boolean
  className?: string
}

export function AreaTabs({ areas, loading = false, className }: AreaTabsProps) {
  const [selectedArea, setSelectedArea] = useState(areas[0]?.id || "")

  const currentArea = useMemo(
    () => areas.find(a => a.id === selectedArea) || areas[0],
    [areas, selectedArea]
  )

  if (!areas || areas.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No areas available</p>
        </CardContent>
      </Card>
    )
  }

  // Chart configurations
  const progressChartConfig = {
    progress: {
      label: "Progress",
      color: "hsl(var(--chart-1))",
    },
  }

  const statusDistributionData = currentArea ? [
    { name: 'Completed', value: currentArea.completedInitiatives, fill: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: currentArea.inProgressInitiatives, fill: 'hsl(var(--chart-2))' },
    { name: 'At Risk', value: currentArea.atRisk, fill: 'hsl(var(--chart-3))' }
  ] : []

  const teamPerformanceConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-2))",
    },
  }

  return (
    <Tabs
      value={selectedArea}
      onValueChange={setSelectedArea}
      className={cn("space-y-6", className)}
    >
      <div className="flex items-center justify-between">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          {areas.map((area) => (
            <TabsTrigger
              key={area.id}
              value={area.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="h-4 w-4" />
              <span>{area.name}</span>
              {area.atRisk > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 px-1 text-xs"
                >
                  {area.atRisk}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/areas/${currentArea?.id}`}>
            View Full Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {areas.map((area) => (
        <TabsContent key={area.id} value={area.id} className="space-y-6">
          {/* Area Overview Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {area.name}
                  </CardTitle>
                  {area.description && (
                    <CardDescription className="mt-1">
                      {area.description}
                    </CardDescription>
                  )}
                  {area.manager && (
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Manager: {area.manager}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{area.averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">Overall Progress</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={area.averageProgress} className="h-2" />
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Initiatives</p>
                  <p className="text-xl font-bold">
                    {area.completedInitiatives}/{area.totalInitiatives}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Team Size</p>
                  <p className="text-xl font-bold">{area.teamMembers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">At Risk</p>
                  <p className={cn(
                    "text-xl font-bold",
                    area.atRisk > 0 && "text-red-500"
                  )}>
                    {area.atRisk}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge 
                    variant={area.atRisk === 0 ? "default" : "destructive"}
                    className="mt-1"
                  >
                    {area.atRisk === 0 ? 'On Track' : 'Needs Attention'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {area.progressTrend && area.progressTrend.length > 0 && (
              <LineChartBlock
                title="Progress Trend"
                description="Progress over time"
                data={area.progressTrend}
                xKey="date"
                yKey="progress"
                config={progressChartConfig}
                className=""
              />
            )}
            
            <PieChartBlock
              title="Status Distribution"
              description="Initiative breakdown by status"
              data={statusDistributionData}
              dataKey="value"
              nameKey="name"
              config={{
                completed: { label: "Completed", color: "hsl(var(--chart-1))" },
                inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
                atRisk: { label: "At Risk", color: "hsl(var(--chart-3))" }
              }}
              className=""
            />
          </div>

          {/* Objectives Section */}
          {area.objectives && area.objectives.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategic Objectives
                </h3>
                <Badge variant="outline">{area.objectives.length} Total</Badge>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  {area.objectives.map((objective) => (
                    <div key={objective.id} className="w-[300px] flex-shrink-0">
                      <ObjectiveCard objective={{ ...objective, area: area.name }} />
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Initiatives Section */}
          {area.initiatives && area.initiatives.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Initiatives
                </h3>
                <Badge variant="outline">{area.initiatives.length} Total</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {area.initiatives.slice(0, 6).map((initiative) => (
                  <InitiativeCard key={initiative.id} initiative={initiative} />
                ))}
              </div>
              {area.initiatives.length > 6 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/areas/${area.id}/initiatives`}>
                    View All Initiatives ({area.initiatives.length})
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Recent Activities */}
          {area.activities && area.activities.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activities
                </h3>
                <Badge variant="outline">
                  {area.activities.filter(a => !a.isCompleted).length} Pending
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {area.activities.slice(0, 4).map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          )}

          {/* Team Performance */}
          {area.teamPerformance && area.teamPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartBlock
                  title=""
                  description=""
                  data={area.teamPerformance.map(member => ({
                    name: member.member,
                    completed: member.completedTasks,
                    pending: member.pendingTasks
                  }))}
                  xKey="name"
                  yKey="completed"
                  config={teamPerformanceConfig}
                  className="h-[200px]"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}