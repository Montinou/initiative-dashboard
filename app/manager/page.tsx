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
  RefreshCw,
  Upload
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 bg-gray-800 rounded w-64 animate-pulse" />
              <div className="h-4 bg-gray-800 rounded w-96 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-gray-800 rounded w-64 animate-pulse" />
              <div className="h-4 bg-gray-800 rounded w-96 animate-pulse" />
            </div>
            
            {/* Stats cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-96 bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md backdrop-blur-xl bg-gray-900/50 border-white/10">
          <CardContent className="text-center p-6">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">{t('dashboard.errorTitle')}</h2>
            <p className="text-gray-400 mb-4">
              {error?.message || t('dashboard.errorMessage')}
            </p>
            <Button onClick={refetch} className="w-full bg-primary hover:bg-primary/90">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('dashboard.tryAgain')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { area, statistics, team_members, initiatives, activities } = dashboardData

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {t('dashboard.title', { areaName: area.name })}
            </h1>
            <p className="text-gray-400">
              {t('dashboard.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t('actions.filter')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('actions.export')}
            </Button>
            <Button 
              size="sm"
              onClick={() => window.location.href = '/manager/import'}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.newInitiative')}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title={t('stats.totalInitiatives')}
            value={statistics.total_initiatives}
            description={t('stats.activeCount', { count: statistics.total_initiatives - statistics.completed_activities })}
            icon={Target}
            trend={{
              value: 12,
              isPositive: true
            }}
          />
          <StatsCard
            title={t('stats.teamMembers')}
            value={statistics.total_team_members}
            description={t('stats.teamDescription')}
            icon={Users}
          />
          <StatsCard
            title={t('stats.averageProgress')}
            value={`${statistics.average_progress}%`}
            description={t('stats.progressDescription')}
            icon={TrendingUp}
            trend={{
              value: 8,
              isPositive: statistics.average_progress > 60
            }}
          />
          <StatsCard
            title={t('stats.overdueActivities')}
            value={statistics.overdue_activities}
            description={statistics.overdue_activities > 0 ? t('stats.needAttention') : t('stats.allOnTrack')}
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
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="initiatives">{t('tabs.initiatives')}</TabsTrigger>
            <TabsTrigger value="team">{t('tabs.team')}</TabsTrigger>
            <TabsTrigger value="activities">{t('tabs.activities')}</TabsTrigger>
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
                    <span>{t('quickActions.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => window.location.href = '/manager/import'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('quickActions.createInitiative')}
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => window.location.href = '/manager/import?tab=upload'}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('quickActions.importFromFile')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    {t('quickActions.assignActivities')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('quickActions.generateReport')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('quickActions.scheduleReview')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChartBlock
                title={t('charts.initiativeProgress.title')}
                description={t('charts.initiativeProgress.description')}
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
                title={t('charts.teamWorkload.title')}
                description={t('charts.teamWorkload.description')}
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