/**
 * Trend Charts Component
 * 
 * Interactive charts showing KPI trends over time with glassmorphism styling
 * and responsive design for various screen sizes
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ===================================================================================
// TYPES
// ===================================================================================

interface TrendData {
  date: string
  total_progress: number
  completed_count: number
  strategic_count: number
  budget_utilization: number
}

interface TrendChartsProps {
  trendData: TrendData[]
  userProfile: any
  loading: boolean
}

type ChartType = 'line' | 'area' | 'bar' | 'pie'
type TimeRange = '7d' | '30d' | '90d' | '1y'

// ===================================================================================
// CUSTOM TOOLTIP COMPONENT
// ===================================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="glassmorphic-card p-3 border border-white/20 shadow-2xl">
      <p className="text-xs text-white/70 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/90">{entry.name}:</span>
          <span className="text-white font-medium">
            {typeof entry.value === 'number' ? 
              entry.value.toFixed(1) : entry.value}
            {entry.name.includes('Progress') || entry.name.includes('Utilization') ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ===================================================================================
// CHART COMPONENTS
// ===================================================================================

function ProgressTrendChart({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-white/60">
        No trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total_progress"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#progressGradient)"
          name="Average Progress"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CompletionTrendChart({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-white/60">
        No completion data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="completed_count" 
          fill="hsl(var(--chart-1))"
          name="Completed Initiatives"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="strategic_count" 
          fill="hsl(var(--chart-2))"
          name="Strategic Initiatives"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function BudgetUtilizationChart({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-white/60">
        No budget data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="budget_utilization"
          stroke="hsl(var(--chart-3))"
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-3))', strokeWidth: 2 }}
          name="Budget Utilization"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ===================================================================================
// MAIN TREND CHARTS COMPONENT
// ===================================================================================

export function TrendCharts({ trendData, userProfile, loading }: TrendChartsProps) {
  const [selectedChart, setSelectedChart] = useState<ChartType>('area')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glassmorphic-card p-6 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="h-80 bg-white/10 rounded"></div>
        </div>
      </div>
    )
  }

  // Filter data based on time range
  const getFilteredData = () => {
    if (!trendData || trendData.length === 0) return []

    const now = new Date()
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }

    const cutoffDate = new Date(now.getTime() - days[timeRange] * 24 * 60 * 60 * 1000)
    
    return trendData.filter(item => new Date(item.date) >= cutoffDate)
  }

  const filteredData = getFilteredData()

  const canViewStrategic = ['CEO', 'Admin'].includes(userProfile?.role)

  return (
    <div className="space-y-6">
      {/* Charts Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphic-card p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">Performance Trends</h3>
            <Badge className="glassmorphic-badge">
              {filteredData.length} data points
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="glassmorphic-input w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glassmorphic-dropdown">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Button
                variant={selectedChart === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedChart('area')}
                className={cn(
                  "h-8 w-8 p-0",
                  selectedChart === 'area' ? 'glassmorphic-button' : 'glassmorphic-button-ghost'
                )}
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={selectedChart === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedChart('bar')}
                className={cn(
                  "h-8 w-8 p-0",
                  selectedChart === 'bar' ? 'glassmorphic-button' : 'glassmorphic-button-ghost'
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant={selectedChart === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedChart('line')}
                className={cn(
                  "h-8 w-8 p-0",
                  selectedChart === 'line' ? 'glassmorphic-button' : 'glassmorphic-button-ghost'
                )}
              >
                <Activity className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chart */}
      <motion.div
        key={selectedChart + timeRange}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphic-card p-6"
      >
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-white mb-2">
            {selectedChart === 'area' ? 'Progress Trend' :
             selectedChart === 'bar' ? 'Completion Trend' :
             'Budget Utilization Trend'}
          </h4>
          <p className="text-sm text-white/70">
            {selectedChart === 'area' ? 'Average progress across all initiatives over time' :
             selectedChart === 'bar' ? 'Number of completed and strategic initiatives' :
             'Budget utilization percentage over time'}
          </p>
        </div>

        {selectedChart === 'area' && <ProgressTrendChart data={filteredData} />}
        {selectedChart === 'bar' && <CompletionTrendChart data={filteredData} />}
        {selectedChart === 'line' && <BudgetUtilizationChart data={filteredData} />}
      </motion.div>

      {/* Summary Stats */}
      {filteredData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphic-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h4 className="text-lg font-semibold text-white">Period Summary</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {Math.max(...filteredData.map(d => d.total_progress)).toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">Peak Progress</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {filteredData.reduce((sum, d) => sum + d.completed_count, 0)}
              </div>
              <div className="text-xs text-white/70">Total Completed</div>
            </div>

            {canViewStrategic && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {filteredData.reduce((sum, d) => sum + d.strategic_count, 0)}
                </div>
                <div className="text-xs text-white/70">Strategic Initiatives</div>
              </div>
            )}

            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {Math.max(...filteredData.map(d => d.budget_utilization)).toFixed(1)}%
              </div>
              <div className="text-xs text-white/70">Peak Budget Usage</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {filteredData.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphic-card p-12 text-center"
        >
          <Activity className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-white mb-2">No Trend Data Available</h4>
          <p className="text-white/70 mb-4">
            No performance data found for the selected time range.
          </p>
          <Button
            variant="outline"
            onClick={() => setTimeRange('1y')}
            className="glassmorphic-button-ghost"
          >
            Try Longer Time Range
          </Button>
        </motion.div>
      )}
    </div>
  )
}

export default TrendCharts