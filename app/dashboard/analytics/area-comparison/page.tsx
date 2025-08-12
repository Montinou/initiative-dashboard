"use client"

import React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts"
import { Layers, TrendingUp, ArrowUp, ArrowDown } from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { ChartLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { useTranslations } from "next-intl"

interface AreaComparisonData {
  area: string
  objectives: number
  completedObjectives: number
  averageProgress: number
  initiatives: number
  completedInitiatives: number
  overallScore: number
}

function AreaMetricCard({ 
  title, 
  value, 
  subtitle, 
  trend 
}: { 
  title: string
  value: string | number
  subtitle?: string
  trend?: { value: number; isPositive: boolean }
}) {
  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
      <CardContent className="p-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.isPositive ? (
                <ArrowUp className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AreaComparisonPage() {
  const t = useTranslations('analytics.areaComparison')
  const tCommon = useTranslations('analytics.common')
  
  const { data, error, isLoading } = useSWR(
    "/api/dashboard/area-comparison"
  )

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Layers}
          title={t('error.title')}
          description={t('error.description')}
          action={{
            label: t('error.refresh'),
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLoadingSkeleton />
          <ChartLoadingSkeleton />
        </div>
      </div>
    )
  }

  const areaData: AreaComparisonData[] = data?.data || []

  // Calculate summary statistics
  const totalAreas = areaData.length
  const bestPerformingArea = areaData.reduce((best, current) => 
    current.overallScore > best.overallScore ? current : best, areaData[0]
  )
  const averageScore = areaData.length > 0 
    ? Math.round(areaData.reduce((sum, area) => sum + area.overallScore, 0) / areaData.length)
    : 0

  // Prepare radar chart data
  const radarData = areaData.map(area => ({
    area: area.area,
    Progress: area.averageProgress || 0,
    Completion: area.objectives > 0 ? Math.round((area.completedObjectives / area.objectives) * 100) : 0,
    Initiatives: area.initiatives > 0 ? Math.round((area.completedInitiatives / area.initiatives) * 100) : 0,
  }))

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">
            {t('subtitle')}
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AreaMetricCard
            title={t('metrics.totalAreas')}
            value={totalAreas}
            subtitle="Business areas being tracked"
          />
          <AreaMetricCard
            title={t('metrics.topPerformer')}
            value={bestPerformingArea?.area || "N/A"}
            subtitle={`${bestPerformingArea?.overallScore || 0}% ${t('metrics.overallScore').toLowerCase()}`}
          />
          <AreaMetricCard
            title={t('metrics.avgProgress')}
            value={`${averageScore}%`}
            subtitle="Across all areas"
            trend={{ value: 5, isPositive: true }}
          />
          <AreaMetricCard
            title={t('metrics.objectives')}
            value={areaData.reduce((sum, area) => sum + (area.objectives || 0), 0)}
            subtitle="Across all areas"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('charts.performanceByArea')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="area" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar 
                    dataKey="overallScore" 
                    fill="url(#gradientBar)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-secondary" />
                {t('charts.radarAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis 
                    dataKey="area" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <PolarRadiusAxis 
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={10}
                    domain={[0, 100]}
                  />
                  <Radar
                    name="Progress"
                    dataKey="Progress"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Completion"
                    dataKey="Completion"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.2}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison Table */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">{t('charts.progressComparison')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-gray-300 font-medium">Area</th>
                    <th className="text-center py-3 text-gray-300 font-medium">{t('metrics.objectives')}</th>
                    <th className="text-center py-3 text-gray-300 font-medium">{t('metrics.completedObjectives')}</th>
                    <th className="text-center py-3 text-gray-300 font-medium">{t('metrics.avgProgress')}</th>
                    <th className="text-center py-3 text-gray-300 font-medium">{t('metrics.overallScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {areaData.map((area, index) => (
                    <tr key={area.area} className="border-b border-white/5">
                      <td className="py-3 text-white font-medium">{area.area}</td>
                      <td className="text-center py-3 text-gray-300">
                        {area.objectives}
                      </td>
                      <td className="text-center py-3 text-gray-300">
                        {area.completedObjectives} / {area.objectives}
                      </td>
                      <td className="text-center py-3 text-gray-300">
                        {area.averageProgress}%
                      </td>
                      <td className="text-center py-3">
                        <span className={`font-medium ${
                          area.overallScore >= 80 ? "text-green-500" :
                          area.overallScore >= 60 ? "text-yellow-500" : "text-red-500"
                        }`}>
                          {area.overallScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}