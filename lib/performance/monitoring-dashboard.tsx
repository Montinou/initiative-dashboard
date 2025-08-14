'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Activity, AlertTriangle, CheckCircle, Clock, Globe, Zap } from 'lucide-react'

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  threshold: { good: number; poor: number }
  unit: string
  description: string
}

interface PerformanceData {
  timestamp: number
  metrics: Record<string, number>
  url: string
  userAgent: string
}

const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms', description: 'Largest Contentful Paint' },
  FID: { good: 100, poor: 300, unit: 'ms', description: 'First Input Delay' },
  CLS: { good: 0.1, poor: 0.25, unit: '', description: 'Cumulative Layout Shift' },
  FCP: { good: 1800, poor: 3000, unit: 'ms', description: 'First Contentful Paint' },
  TTFB: { good: 800, poor: 1800, unit: 'ms', description: 'Time to First Byte' }
}

export function PerformanceMonitoringDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [historicalData, setHistoricalData] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<string>('LCP')

  useEffect(() => {
    fetchPerformanceData()
    const interval = setInterval(fetchPerformanceData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/analytics/performance?limit=50')
      const data = await response.json()
      
      if (data.metrics && data.aggregations) {
        // Convert aggregations to metrics
        const currentMetrics = Object.entries(data.aggregations).map(([name, stats]: [string, any]) => ({
          name,
          value: stats.avg,
          rating: getRating(name, stats.avg),
          threshold: WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS] || { good: 0, poor: 0, unit: '', description: '' },
          unit: WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS]?.unit || '',
          description: WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS]?.description || name
        }))

        setMetrics(currentMetrics)

        // Process historical data for charts
        const historical = data.metrics
          .map((metric: any) => ({
            timestamp: new Date(metric.timestamp).getTime(),
            [metric.metric_name]: metric.metric_value,
            url: metric.url,
            userAgent: metric.user_agent
          }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp)

        setHistoricalData(historical)
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRating = (metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = WEB_VITALS_THRESHOLDS[metricName as keyof typeof WEB_VITALS_THRESHOLDS]
    if (!thresholds) return 'good'
    
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckCircle className="h-4 w-4" />
      case 'needs-improvement': return <Clock className="h-4 w-4" />
      case 'poor': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`
    }
    if (unit === '') {
      return value.toFixed(3)
    }
    return `${value.toFixed(1)}${unit}`
  }

  const chartData = historicalData
    .filter(d => d[selectedMetric] !== undefined)
    .map(d => ({
      timestamp: d.timestamp,
      date: new Date(d.timestamp).toLocaleTimeString(),
      value: d[selectedMetric]
    }))
    .slice(-20) // Last 20 data points

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Performance Monitoring</h2>
        <Badge variant="outline" className="ml-auto">
          Live Data
        </Badge>
      </div>

      {/* Core Web Vitals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card 
            key={metric.name}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedMetric === metric.name ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedMetric(metric.name)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getRatingIcon(metric.rating)}
                {metric.name}
                <Badge className={`ml-auto ${getRatingColor(metric.rating)}`}>
                  {metric.rating.replace('-', ' ')}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {metric.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(metric.value, metric.unit)}
              </div>
              {metric.threshold.good > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Good: {formatValue(metric.threshold.good, metric.unit)}</span>
                    <span>Poor: {formatValue(metric.threshold.poor, metric.unit)}</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (metric.value / metric.threshold.poor) * 100)}
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Historical Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {selectedMetric} Trend
            </CardTitle>
            <CardDescription>
              Performance over time for {WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS]?.description || selectedMetric}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS]?.unit || '', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [
                    formatValue(value, WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS]?.unit || ''),
                    selectedMetric
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                {/* Good threshold line */}
                {WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS]?.good && (
                  <Line 
                    type="monotone" 
                    dataKey={() => WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS].good}
                    stroke="#10B981" 
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {/* Poor threshold line */}
                {WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS]?.poor && (
                  <Line 
                    type="monotone" 
                    dataKey={() => WEB_VITALS_THRESHOLDS[selectedMetric as keyof typeof WEB_VITALS_THRESHOLDS].poor}
                    stroke="#EF4444" 
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Score</CardTitle>
            <CardDescription>Overall web vitals health</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceScore metrics={metrics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Performance optimization suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceRecommendations metrics={metrics} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PerformanceScore({ metrics }: { metrics: PerformanceMetric[] }) {
  const score = calculatePerformanceScore(metrics)
  const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${scoreColor}`}>
        {score}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        Performance Score
      </div>
      <Progress value={score} className="mt-4" />
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>Poor (0-49)</span>
        <span>Good (50-89)</span>
        <span>Excellent (90-100)</span>
      </div>
    </div>
  )
}

function PerformanceRecommendations({ metrics }: { metrics: PerformanceMetric[] }) {
  const recommendations = generateRecommendations(metrics)

  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-sm">{rec.title}</div>
            <div className="text-xs text-gray-600 mt-1">{rec.description}</div>
          </div>
        </div>
      ))}
      {recommendations.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-sm">All metrics are performing well!</div>
        </div>
      )}
    </div>
  )
}

function calculatePerformanceScore(metrics: PerformanceMetric[]): number {
  if (metrics.length === 0) return 0

  const weights = { LCP: 0.25, FID: 0.25, CLS: 0.25, FCP: 0.15, TTFB: 0.1 }
  let totalScore = 0
  let totalWeight = 0

  metrics.forEach(metric => {
    const weight = weights[metric.name as keyof typeof weights] || 0.1
    let score = 0

    if (metric.rating === 'good') score = 100
    else if (metric.rating === 'needs-improvement') score = 70
    else score = 30

    totalScore += score * weight
    totalWeight += weight
  })

  return Math.round(totalScore / totalWeight)
}

function generateRecommendations(metrics: PerformanceMetric[]) {
  const recommendations: Array<{ title: string; description: string }> = []

  metrics.forEach(metric => {
    if (metric.rating === 'poor') {
      switch (metric.name) {
        case 'LCP':
          recommendations.push({
            title: 'Optimize Largest Contentful Paint',
            description: 'Consider optimizing images, fonts, and reducing server response times.'
          })
          break
        case 'FID':
          recommendations.push({
            title: 'Reduce First Input Delay',
            description: 'Minimize JavaScript execution time and consider code splitting.'
          })
          break
        case 'CLS':
          recommendations.push({
            title: 'Improve Layout Stability',
            description: 'Reserve space for images and avoid inserting content above existing elements.'
          })
          break
        case 'FCP':
          recommendations.push({
            title: 'Optimize First Contentful Paint',
            description: 'Reduce render-blocking resources and optimize the critical rendering path.'
          })
          break
        case 'TTFB':
          recommendations.push({
            title: 'Improve Server Response Time',
            description: 'Optimize server performance, use CDN, and implement caching strategies.'
          })
          break
      }
    }
  })

  return recommendations
}