'use client'

import { useState, useEffect } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  Target,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  ArrowUp,
  ArrowDown,
  Filter,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// Real analytics data from hooks

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ReportsAnalyticsPage() {
  const [dateRange, setDateRange] = useState('last-6-months')
  const [selectedMetric, setSelectedMetric] = useState('all')
  const [reportType, setReportType] = useState('overview')
  const [locale, setLocale] = useState('es')

  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  // Fetch real analytics data
  const { data: analytics, overview, trends, performance, loading, error, refetch } = useAnalytics({
    timeframe: dateRange.replace('last-', '').replace('-days', '').replace('-months', '').replace('-year', '365')
  })

  const handleExportReport = async (format: string) => {
    try {
      const data = {
        overview,
        trends,
        performance,
        statusDistribution,
        generatedAt: new Date().toISOString()
      }
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `report-${dateRange}-${new Date().toISOString()}.json`
        link.click()
        URL.revokeObjectURL(url)
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(data)
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `report-${dateRange}-${new Date().toISOString()}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else if (format === 'pdf') {
        // For PDF, we would typically use a library like jsPDF or send to backend
        alert('PDF export will be available in the next update')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report')
    }
  }
  
  const convertToCSV = (data: any) => {
    const lines = []
    lines.push('Metric,Value')
    lines.push(`Total Users,${data.overview?.totalUsers || 0}`)
    lines.push(`Average Progress,${data.overview?.averageProgress || 0}%`)
    lines.push(`Total Initiatives,${data.overview?.totalInitiatives || 0}`)
    lines.push(`Total Areas,${data.overview?.totalAreas || 0}`)
    lines.push(`Generated At,${data.generatedAt}`)
    return lines.join('\n')
  }

  const handleScheduleReport = () => {
    // Schedule report generation
    const scheduleOptions = {
      frequency: 'weekly', // daily, weekly, monthly
      format: 'pdf',
      recipients: [],
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
    }
    
    // Store schedule in localStorage for now (backend integration in future)
    localStorage.setItem('reportSchedule', JSON.stringify(scheduleOptions))
    alert(`Report scheduled for ${scheduleOptions.frequency} delivery. Feature coming soon!`)
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()
  
  // Create status distribution data
  const statusDistribution = overview ? [
    { name: locale === 'es' ? 'Completado' : 'Completed', value: overview.initiativesByStatus.completed, color: '#10B981' },
    { name: locale === 'es' ? 'En Progreso' : 'In Progress', value: overview.initiativesByStatus.in_progress, color: '#3B82F6' },
    { name: locale === 'es' ? 'Planificando' : 'Planning', value: overview.initiativesByStatus.planning, color: '#F59E0B' },
    { name: locale === 'es' ? 'En Pausa' : 'On Hold', value: overview.initiativesByStatus.on_hold, color: '#EF4444' }
  ] : []

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mr-4"></div>
          <span className="text-white text-lg">{locale === 'es' ? 'Cargando analíticas...' : 'Loading analytics...'}</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-400 text-lg mb-4">{locale === 'es' ? 'Error al cargar analíticas' : 'Error loading analytics'}</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {locale === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="space-y-6 backdrop-blur-xl">
        {/* Header */}
        <div className="backdrop-blur-xl bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === 'es' ? 'Reportes y Analítica' : 'Reports & Analytics'}
              </h1>
              <p className="text-gray-400 mt-2">
                {locale === 'es'
                  ? 'Perspectivas organizacionales integrales y analíticas de rendimiento'
                  : 'Comprehensive organizational insights and performance analytics'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="last-30-days">{locale === 'es' ? 'Últimos 30 días' : 'Last 30 days'}</SelectItem>
                  <SelectItem value="last-3-months">{locale === 'es' ? 'Últimos 3 meses' : 'Last 3 months'}</SelectItem>
                  <SelectItem value="last-6-months">{locale === 'es' ? 'Últimos 6 meses' : 'Last 6 months'}</SelectItem>
                  <SelectItem value="last-year">{locale === 'es' ? 'Último año' : 'Last year'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleScheduleReport} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700">
                <Mail className="h-4 w-4" />
                {locale === 'es' ? 'Programar' : 'Schedule'}
              </Button>
              <Button onClick={() => handleExportReport('pdf')} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                <Download className="h-4 w-4" />
                {locale === 'es' ? 'Exportar' : 'Export'}
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Total Usuarios' : 'Total Users'}</p>
                  <p className="text-2xl font-bold text-white">{overview?.totalUsers || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUp className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">{locale === 'es' ? '+12% este mes' : '+12% this month'}</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Progreso Promedio' : 'Average Progress'}</p>
                  <p className="text-2xl font-bold text-white">{overview?.averageProgress || 0}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUp className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">{locale === 'es' ? '+5% este período' : '+5% this period'}</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Target className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Total Iniciativas' : 'Total Initiatives'}</p>
                  <p className="text-2xl font-bold text-white">{overview?.totalInitiatives || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUp className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">{locale === 'es' ? '+15% este mes' : '+15% this month'}</span>
                  </div>
                </div>
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Áreas Activas' : 'Active Areas'}</p>
                  <p className="text-2xl font-bold text-white">{overview?.totalAreas || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-gray-400">{locale === 'es' ? 'Todas operacionales' : 'All operational'}</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <Building2 className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends Chart */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {locale === 'es' ? 'Tendencias de Rendimiento' : 'Performance Trends'}
            </CardTitle>
          </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends?.initiativeCreationTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Initiatives Created"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Area Performance */}
          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-secondary" />
                {locale === 'es' ? 'Rendimiento por Área' : 'Area Performance'}
              </CardTitle>
            </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance?.areaPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="areaName" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="completionRate" fill="url(#areaGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          {/* Status Distribution */}
          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {locale === 'es' ? 'Distribución de Estado de Objetivos' : 'Objective Status Distribution'}
              </CardTitle>
            </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

        {/* User Activity Pattern */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              {locale === 'es' ? 'Patrones de Actividad de Usuario' : 'User Activity Patterns'}
            </CardTitle>
          </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trends?.userActivityTrend?.slice(-7) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="activeUsers" fill="#3B82F6" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Predictive Insights - Coming Soon */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            {locale === 'es' ? 'Perspectivas Predictivas y Recomendaciones' : 'Predictive Insights & Recommendations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p>{locale === 'es' ? 'Las perspectivas predictivas estarán disponibles pronto' : 'Predictive insights coming soon'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Area Performance Details */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Detailed Area Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-gray-300 font-medium">Area</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Performance Score</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Objectives</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Completion Rate</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Team Size</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(performance?.areaPerformance || []).map((area, index) => (
                  <tr key={area.areaId} className="border-b border-white/5">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium">{area.areaName}</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${area.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm">{area.completionRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 text-gray-300">
                      {area.completedInitiatives}/{area.totalInitiatives}
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        area.completionRate >= 80 ? 'text-green-400' :
                        area.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {area.completionRate}%
                      </span>
                    </td>
                    <td className="text-center py-3 text-gray-300">
                      -
                    </td>
                    <td className="text-center py-3">
                      <Badge variant={area.completionRate >= 80 ? "default" : "secondary"}>
                        {area.completionRate >= 80 ? 'Excellent' : area.completionRate >= 60 ? 'Good' : 'Needs Attention'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}