"use client"

import React, { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts"
import { PieChart as PieChartIcon, TrendingUp, Target, Download } from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { ChartLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { useTranslations } from "next-intl"
import { AnalyticsFilterSidebar } from "@/components/analytics/AnalyticsFilterSidebar"
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext"

const PROGRESS_COLORS = [
  "#ef4444", // 0-25% - Red
  "#f97316", // 26-50% - Orange
  "#eab308", // 51-75% - Yellow
  "#22c55e", // 76-100% - Green
]

interface ProgressData {
  range: string
  count: number
  percentage: number
  color: string
}

export default function ProgressDistributionPage() {
  const t = useTranslations('analytics.progressDistribution')
  const tCommon = useTranslations('analytics.common')
  const { getFilterParams } = useAnalyticsFilters()
  
  // Build API URL with filter params
  const apiUrl = useMemo(() => {
    const params = getFilterParams()
    const queryString = new URLSearchParams(params).toString()
    return `/api/dashboard/progress-distribution${queryString ? `?${queryString}` : ''}`
  }, [getFilterParams])
  
  const { data, error, isLoading, mutate } = useSWR(apiUrl)

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={PieChartIcon}
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

  const progressData = data?.data || []
  
  // Categorize progress data
  const categorizedData: ProgressData[] = [
    { range: "0-25%", count: 0, percentage: 0, color: PROGRESS_COLORS[0] },
    { range: "26-50%", count: 0, percentage: 0, color: PROGRESS_COLORS[1] },
    { range: "51-75%", count: 0, percentage: 0, color: PROGRESS_COLORS[2] },
    { range: "76-100%", count: 0, percentage: 0, color: PROGRESS_COLORS[3] },
  ]

  progressData.forEach((item: any) => {
    const progress = item.progress
    if (progress <= 25) categorizedData[0].count++
    else if (progress <= 50) categorizedData[1].count++
    else if (progress <= 75) categorizedData[2].count++
    else categorizedData[3].count++
  })

  const total = progressData.length
  categorizedData.forEach(category => {
    category.percentage = total > 0 ? Math.round((category.count / total) * 100) : 0
  })

  // Calculate statistics
  const averageProgress = total > 0 
    ? Math.round(progressData.reduce((sum: number, item: any) => sum + item.progress, 0) / total)
    : 0
  
  const highPerformers = categorizedData[3].count // 76-100%
  const lowPerformers = categorizedData[0].count // 0-25%

  // Prepare histogram data
  const histogramData = []
  for (let i = 0; i <= 100; i += 10) {
    const range = `${i}-${i + 9}%`
    const count = progressData.filter((item: any) => 
      item.progress >= i && item.progress < i + 10
    ).length
    histogramData.push({ range, count })
  }

  // Export function
  const handleExport = () => {
    const csv = [
      ['Progress Range', 'Count', 'Percentage'],
      ...categorizedData.map(row => [
        row.range,
        row.count,
        row.percentage + '%'
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `progress-distribution-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <ErrorBoundary>
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-64 flex-shrink-0">
          <AnalyticsFilterSidebar 
            onExport={handleExport}
            showStatusFilter={false}
            showPriorityFilter={false}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">
            {t('subtitle')}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('metrics.totalInitiatives')}</p>
                  <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('metrics.avgProgress')}</p>
                  <p className="text-2xl font-bold text-white">{averageProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">High Performers</p>
                  <p className="text-2xl font-bold text-green-500">{highPerformers}</p>
                  <p className="text-xs text-gray-500">76-100% progress</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-500 text-sm font-bold">↑</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Needs Attention</p>
                  <p className="text-2xl font-bold text-red-500">{lowPerformers}</p>
                  <p className="text-xs text-gray-500">0-25% progress</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-500 text-sm font-bold">!</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Progress Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorizedData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percentage }) => `${range}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categorizedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Histogram */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                Progress Histogram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="range" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                    dataKey="count" 
                    fill="url(#gradientHistogram)"
                    radius={[2, 2, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="gradientHistogram" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categorizedData.map((category, index) => (
                <div key={category.range} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">{category.range}</span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{category.count}</p>
                  <p className="text-sm text-gray-400">{category.percentage}% of total</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}