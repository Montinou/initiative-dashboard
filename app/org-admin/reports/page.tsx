'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Filter
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

// Mock analytics data
const analytics = {
  overview: {
    totalUsers: 24,
    activeUsers: 22,
    totalAreas: 6,
    totalObjectives: 18,
    completedObjectives: 12,
    averageCompletion: 67,
    monthlyGrowth: 15.3,
    userEngagement: 89.2
  },
  performanceTrends: [
    { month: 'Jan', objectives: 8, completed: 6, users: 20 },
    { month: 'Feb', objectives: 12, completed: 8, users: 22 },
    { month: 'Mar', objectives: 15, completed: 10, users: 23 },
    { month: 'Apr', objectives: 18, completed: 12, users: 24 },
    { month: 'May', objectives: 20, completed: 14, users: 24 },
    { month: 'Jun', objectives: 22, completed: 16, users: 25 }
  ],
  areaPerformance: [
    { area: 'Sales', score: 92, objectives: 5, completed: 4, users: 8 },
    { area: 'Technology', score: 88, objectives: 6, completed: 5, users: 12 },
    { area: 'Finance', score: 75, objectives: 3, completed: 2, users: 4 },
    { area: 'HR', score: 65, objectives: 2, completed: 1, users: 3 },
    { area: 'Operations', score: 82, objectives: 2, completed: 2, users: 6 }
  ],
  userActivity: [
    { day: 'Mon', logins: 18, active: 22 },
    { day: 'Tue', logins: 20, active: 24 },
    { day: 'Wed', logins: 19, active: 23 },
    { day: 'Thu', logins: 22, active: 25 },
    { day: 'Fri', logins: 17, active: 21 },
    { day: 'Sat', logins: 8, active: 12 },
    { day: 'Sun', logins: 5, active: 8 }
  ],
  statusDistribution: [
    { name: 'Completed', value: 12, color: '#10B981' },
    { name: 'In Progress', value: 6, color: '#3B82F6' },
    { name: 'Planning', value: 2, color: '#F59E0B' },
    { name: 'Overdue', value: 2, color: '#EF4444' }
  ],
  predictiveInsights: [
    {
      id: 1,
      type: 'opportunity',
      title: 'High Performance Area',
      description: 'Sales team is exceeding targets. Consider expanding their objectives.',
      impact: 'high',
      confidence: 92
    },
    {
      id: 2,
      type: 'risk',
      title: 'Resource Constraint',
      description: 'HR area shows declining performance. May need additional resources.',
      impact: 'medium',
      confidence: 78
    },
    {
      id: 3,
      type: 'trend',
      title: 'Engagement Growth',
      description: 'User engagement increased 15% this quarter. Maintain current strategies.',
      impact: 'positive',
      confidence: 85
    }
  ]
}

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

  const handleExportReport = (format: string) => {
    console.log(`Exporting report in ${format} format`)
    // TODO: Implement actual export functionality
  }

  const handleScheduleReport = () => {
    console.log('Opening schedule report modal')
    // TODO: Implement scheduling functionality
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
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
                  <p className="text-2xl font-bold text-white">{analytics.overview.totalUsers}</p>
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
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Completado de Objetivos' : 'Objective Completion'}</p>
                  <p className="text-2xl font-bold text-white">{analytics.overview.averageCompletion}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUp className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400">{locale === 'es' ? '+5% este trimestre' : '+5% this quarter'}</span>
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
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Engagement de Usuario' : 'User Engagement'}</p>
                  <p className="text-2xl font-bold text-white">{formatPercentage(analytics.overview.userEngagement)}</p>
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
                  <p className="text-2xl font-bold text-white">{analytics.overview.totalAreas}</p>
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
            <LineChart data={analytics.performanceTrends}>
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
                dataKey="objectives" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Total Objectives"
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Completed"
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Active Users"
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
              <BarChart data={analytics.areaPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="area" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="score" fill="url(#areaGradient)" radius={[4, 4, 0, 0]} />
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
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusDistribution.map((entry, index) => (
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
            <BarChart data={analytics.userActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" />
              <YAxis stroke="rgba(255,255,255,0.6)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="logins" fill="#3B82F6" name="Daily Logins" />
              <Bar dataKey="active" fill="#10B981" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Predictive Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.predictiveInsights.map((insight) => (
              <div key={insight.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'opportunity' ? 'bg-green-500/20' :
                        insight.type === 'risk' ? 'bg-red-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        {insight.type === 'opportunity' ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : insight.type === 'risk' ? (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        ) : (
                          <BarChart3 className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{insight.title}</h4>
                        <p className="text-sm text-gray-400">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${
                        insight.impact === 'high' ? 'text-red-400 border-red-400' :
                        insight.impact === 'medium' ? 'text-yellow-400 border-yellow-400' :
                        'text-green-400 border-green-400'
                      }`}
                    >
                      {insight.impact === 'positive' ? 'Positive' : insight.impact} Impact
                    </Badge>
                    <div className="text-sm text-gray-400">
                      {insight.confidence}% confidence
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                {analytics.areaPerformance.map((area, index) => (
                  <tr key={area.area} className="border-b border-white/5">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        <span className="text-white font-medium">{area.area}</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${area.score}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm">{area.score}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 text-gray-300">
                      {area.completed}/{area.objectives}
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        (area.completed / area.objectives) >= 0.8 ? 'text-green-400' :
                        (area.completed / area.objectives) >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {Math.round((area.completed / area.objectives) * 100)}%
                      </span>
                    </td>
                    <td className="text-center py-3 text-gray-300">
                      {area.users}
                    </td>
                    <td className="text-center py-3">
                      <Badge variant={area.score >= 80 ? "default" : "secondary"}>
                        {area.score >= 80 ? 'Excellent' : area.score >= 60 ? 'Good' : 'Needs Attention'}
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