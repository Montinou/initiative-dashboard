"use client"

import React from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Pause,
  TrendingUp 
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { ChartLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"

const STATUS_CONFIG = {
  "Active": { 
    color: "#3b82f6", 
    icon: Clock, 
    bgColor: "bg-blue-500/10", 
    textColor: "text-blue-500",
    borderColor: "border-blue-500/20"
  },
  "Completed": { 
    color: "#22c55e", 
    icon: CheckCircle2, 
    bgColor: "bg-green-500/10", 
    textColor: "text-green-500",
    borderColor: "border-green-500/20"
  },
  "At Risk": { 
    color: "#ef4444", 
    icon: AlertTriangle, 
    bgColor: "bg-red-500/10", 
    textColor: "text-red-500",
    borderColor: "border-red-500/20"
  },
  "On Hold": { 
    color: "#6b7280", 
    icon: Pause, 
    bgColor: "bg-gray-500/10", 
    textColor: "text-gray-500",
    borderColor: "border-gray-500/20"
  },
}

interface StatusData {
  status: string
  count: number
  percentage: number
  items: Array<{
    id: string
    name: string
    area: string
    progress: number
  }>
}

function StatusCard({ 
  status, 
  count, 
  percentage, 
  items 
}: StatusData) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  const Icon = config.icon

  return (
    <Card className={cn(
      "backdrop-blur-sm border transition-all hover:border-white/20",
      config.bgColor,
      config.borderColor
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.textColor)} />
            <CardTitle className="text-white">{status}</CardTitle>
          </div>
          <Badge variant="outline" className={cn(config.bgColor, config.textColor)}>
            {percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-3xl font-bold text-white">{count}</div>
          <div className="space-y-2">
            {items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate flex-1">{item.name}</span>
                <span className="text-gray-400 ml-2">{item.progress}%</span>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-gray-500">
                +{items.length - 3} more
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StatusDistributionPage() {
  const { data, error, isLoading } = useSWR(
    "/api/dashboard/status-distribution"
  )

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Activity}
          title="Unable to load status distribution"
          description="There was an error loading the status distribution data. Please try refreshing the page."
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
        <h1 className="text-3xl font-bold text-white">Status Distribution</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLoadingSkeleton />
          <ChartLoadingSkeleton />
        </div>
      </div>
    )
  }

  const rawData = data?.data || []
  
  // Group data by status
  const statusGroups: Record<string, any[]> = {}
  rawData.forEach((item: any) => {
    if (!statusGroups[item.status]) {
      statusGroups[item.status] = []
    }
    statusGroups[item.status].push(item)
  })

  // Create status data with percentages
  const total = rawData.length
  const statusData: StatusData[] = Object.entries(statusGroups).map(([status, items]) => ({
    status,
    count: items.length,
    percentage: total > 0 ? Math.round((items.length / total) * 100) : 0,
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      area: item.area || 'Unknown',
      progress: item.progress || 0
    }))
  }))

  // Prepare chart data
  const pieData = statusData.map(({ status, count }) => ({
    name: status,
    value: count,
    color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || "#6b7280"
  }))

  const barData = statusData.map(({ status, count }) => ({
    status,
    count,
    color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || "#6b7280"
  }))

  // Calculate key metrics
  const completionRate = total > 0 
    ? Math.round(((statusGroups["Completed"]?.length || 0) / total) * 100) 
    : 0
  const atRiskCount = statusGroups["At Risk"]?.length || 0
  const activeCount = statusGroups["Active"]?.length || 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Status Distribution</h1>
          <p className="text-gray-400 mt-2">
            View the current status breakdown of all initiatives
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Initiatives</p>
                  <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-500">{completionRate}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Need Attention</p>
                  <p className="text-2xl font-bold text-red-500">{atRiskCount}</p>
                  <p className="text-xs text-gray-500">At risk initiatives</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusData.map((statusInfo) => (
            <StatusCard key={statusInfo.status} {...statusInfo} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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

          {/* Bar Chart */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                Status Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="status" 
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
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Status Breakdown */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Detailed Status Breakdown</CardTitle>
          </CardHeader> 
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-gray-300 font-medium">Status</th>
                    <th className="text-center py-3 text-gray-300 font-medium">Count</th>
                    <th className="text-center py-3 text-gray-300 font-medium">Percentage</th>
                    <th className="text-left py-3 text-gray-300 font-medium">Recent Items</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.map((statusInfo) => {
                    const config = STATUS_CONFIG[statusInfo.status as keyof typeof STATUS_CONFIG]
                    const Icon = config?.icon || Activity
                    
                    return (
                      <tr key={statusInfo.status} className="border-b border-white/5">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config?.textColor)} />
                            <span className="text-white font-medium">{statusInfo.status}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-300">
                          {statusInfo.count}
                        </td>
                        <td className="text-center py-3 text-gray-300">
                          {statusInfo.percentage}%
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            {statusInfo.items.slice(0, 2).map((item) => (
                              <div key={item.id} className="text-sm text-gray-400">
                                {item.name}
                              </div>
                            ))}
                            {statusInfo.items.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{statusInfo.items.length - 2} more
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}