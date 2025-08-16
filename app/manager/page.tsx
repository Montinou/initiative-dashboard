"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useManagerViews } from '@/hooks/useManagerViews'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Users,
  Target,
  Activity,
  FileText,
  TrendingUp,
  AlertTriangle,
  Plus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'

// Import shadcn blocks
import { StatsCard } from '@/components/blocks/dashboards/stats-card'
import { DataTable } from '@/components/blocks/tables/data-table'
import { FormBuilder } from '@/components/blocks/forms/form-builder'
import { 
  LineChartBlock, 
  BarChartBlock, 
  PieChartBlock 
} from '@/components/blocks/charts/dashboard-charts'

// Import manager-specific components
import { AreaMetrics } from '@/components/manager/AreaMetrics'
import { TeamOverview } from '@/components/manager/TeamOverview'
import { InitiativeManagement } from '@/components/manager/InitiativeManagement'
import { ActivityAssignment } from '@/components/manager/ActivityAssignment'

export default function ManagerDashboardPage() {
  const { profile, loading: authLoading, user } = useAuth()
  const t = useTranslations('manager')
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  })
  
  const { dashboardData, loading, error, refetch } = useManagerViews({
    area_id: profile?.area_id,
    include_team_details: true,
    include_recent_updates: true
  })

  // Auth is handled by layout, just check loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-64 animate-pulse" />
              <div className="h-4 bg-muted rounded w-96 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-64 animate-pulse" />
              <div className="h-4 bg-muted rounded w-96 animate-pulse" />
            </div>
            
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-muted rounded-lg animate-pulse" />
              <div className="h-96 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Dashboard</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Failed to load manager dashboard data'}
            </p>
            <Button onClick={refetch} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { area, statistics, team_members, initiatives, activities } = dashboardData

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {area.name} Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your area's initiatives, team, and progress
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Initiative
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Initiatives"
            value={statistics.total_initiatives}
            description={`${statistics.total_initiatives - statistics.completed_activities} active`}
            icon={Target}
            trend={{
              value: 12,
              isPositive: true
            }}
          />
          <StatsCard
            title="Team Members"
            value={statistics.total_team_members}
            description="Active in your area"
            icon={Users}
          />
          <StatsCard
            title="Average Progress"
            value={`${statistics.average_progress}%`}
            description="Across all initiatives"
            icon={TrendingUp}
            trend={{
              value: 8,
              isPositive: statistics.average_progress > 60
            }}
          />
          <StatsCard
            title="Overdue Activities"
            value={statistics.overdue_activities}
            description={statistics.overdue_activities > 0 ? "Need attention" : "All on track"}
            icon={AlertTriangle}
            trend={{
              value: statistics.overdue_activities,
              isPositive: false
            }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Area Performance Metrics */}
              <div className="lg:col-span-2">
                <AreaMetrics 
                  areaId={area.id}
                  dateRange={selectedDateRange}
                />
              </div>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Initiative
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Assign Activities
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Review
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChartBlock
                title="Initiative Progress"
                description="Progress distribution across initiatives"
                data={initiatives.map(init => ({
                  name: init.title.slice(0, 20) + '...',
                  progress: init.progress
                }))}
                xKey="name"
                yKey="progress"
                config={{
                  progress: {
                    label: "Progress %",
                    color: "hsl(var(--chart-1))"
                  }
                }}
              />
              
              <PieChartBlock
                title="Team Workload"
                description="Activity distribution among team members"
                data={team_members.map(member => ({
                  name: member.full_name,
                  activities: member.assigned_activities
                }))}
                dataKey="activities"
                nameKey="name"
                config={{
                  activities: {
                    label: "Activities",
                    color: "hsl(var(--chart-2))"
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="initiatives" className="space-y-6">
            <InitiativeManagement 
              areaId={area.id}
              initiatives={initiatives}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <TeamOverview 
              areaId={area.id}
              teamMembers={team_members}
              onRefresh={refetch}
            />
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <ActivityAssignment 
              areaId={area.id}
              activities={activities}
              teamMembers={team_members}
              onRefresh={refetch}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}