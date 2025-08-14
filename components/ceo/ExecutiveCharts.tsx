"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Users,
  Target,
  DollarSign,
  Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
  }>
}

interface ExecutiveChartsProps {
  data?: {
    initiativesByArea?: ChartData
    progressTrends?: ChartData
    objectiveDistribution?: ChartData
    completionRates?: ChartData
    resourceAllocation?: ChartData
    performanceMetrics?: ChartData
  }
  loading: boolean
  timeRange: string
  className?: string
}

// Simple bar chart component
function SimpleBarChart({ data }: { data: ChartData }) {
  const maxValue = Math.max(...data.datasets[0].data)
  
  return (
    <div className="space-y-3">
      {data.labels.map((label, index) => (
        <div key={label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-medium">
              {data.datasets[0].data[index]}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(data.datasets[0].data[index] / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-2 rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Simple pie chart component
function SimplePieChart({ data }: { data: ChartData }) {
  const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-pink-500'
  ]
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {data.labels.map((label, index) => {
          const percentage = Math.round((data.datasets[0].data[index] / total) * 100)
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", colors[index % colors.length])} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm text-foreground font-medium">{percentage}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Line chart component
function SimpleLineChart({ data }: { data: ChartData }) {
  const maxValue = Math.max(...data.datasets[0].data)
  const points = data.datasets[0].data.map((value, index) => ({
    x: (index / (data.datasets[0].data.length - 1)) * 100,
    y: 100 - ((value / maxValue) * 100)
  }))
  
  return (
    <div className="relative h-48">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-muted-foreground"
          />
        ))}
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
        />
        
        {/* Area under line */}
        <polygon
          fill="url(#gradient-fill)"
          points={`0,100 ${points.map(p => `${p.x},${p.y}`).join(' ')} 100,100`}
          opacity="0.3"
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="gradient-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
        {data.labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  )
}

export function ExecutiveCharts({ 
  data, 
  loading, 
  timeRange,
  className 
}: ExecutiveChartsProps) {
  const [selectedChart, setSelectedChart] = useState("overview")
  const [chartType, setChartType] = useState("bar")

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} >
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Mock data for demonstration
  const mockData = {
    initiativesByArea: {
      labels: ['Sales', 'Marketing', 'Engineering', 'Operations', 'HR'],
      datasets: [{
        label: 'Initiatives',
        data: [12, 8, 15, 10, 6],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
      }]
    },
    progressTrends: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Progress %',
        data: [45, 52, 58, 65, 72, 78],
        borderColor: '#3B82F6'
      }]
    },
    objectiveDistribution: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Objectives',
        data: [8, 12, 10, 15]
      }]
    },
    completionRates: {
      labels: ['Completed', 'In Progress', 'Planning', 'At Risk'],
      datasets: [{
        label: 'Status',
        data: [35, 40, 15, 10],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
      }]
    }
  }

  const chartData = data || mockData

  return (
    <div className={cn("space-y-6", className)}>
      {/* Chart Controls */}
      <Card >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Executive Analytics
            </CardTitle>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Initiatives by Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card >
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Initiatives by Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={chartData.initiativesByArea!} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card >
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={chartData.progressTrends!} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Objective Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card >
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objective Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={chartData.objectiveDistribution!} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Completion Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card >
            <CardHeader>
              <CardTitle className="text-foreground text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Completion Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimplePieChart data={chartData.completionRates!} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Summary */}
      <Card >
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">YTD Growth</p>
              <p className="text-2xl font-bold text-primary">+24%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Efficiency Score</p>
              <p className="text-2xl font-bold text-blue-500">87/100</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Team Productivity</p>
              <p className="text-2xl font-bold text-purple-500">92%</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">ROI</p>
              <p className="text-2xl font-bold text-accent">3.2x</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}