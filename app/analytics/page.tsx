'use client'

import { useState, useEffect } from 'react'
import { RoleNavigation } from "@/components/role-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  ArrowLeft, 
  Download, 
  Users, 
  Target, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  Activity
} from "lucide-react"
import { getThemeFromDomain, generateThemeCSS } from '@/lib/theme-config'
import { ProtectedRoute } from '@/components/protected-route'
import { useAnalytics } from '@/hooks/useAnalytics'
import Link from "next/link"

export default function AnalyticsPage() {
  const [theme, setTheme] = useState<any>(null)
  const [timeframe, setTimeframe] = useState('30')
  
  const { data, loading, error, refetch } = useAnalytics({ timeframe })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = getThemeFromDomain(window.location.hostname)
        setTheme(currentTheme)
      } catch (error) {
        console.error('Theme loading error:', error)
      }
    }
  }, [])

  const formatPercentage = (value: number) => `${value}%`
  const formatDays = (days: number) => `${days} days`

  return (
    <ProtectedRoute>
      <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <RoleNavigation />
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-white/70">Advanced insights and reporting</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900/90 border-white/20">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
          
          {/* Error Alert */}
          {error && (
            <Alert className="border-red-500 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-slate-400 mt-2">Loading analytics...</p>
            </div>
          ) : !data ? (
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
                <p className="text-white/70 mb-4">There's no data to analyze yet</p>
                <p className="text-sm text-white/50">
                  Start by creating some initiatives and areas to see analytics
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm font-medium">Total Initiatives</p>
                        <p className="text-2xl font-bold text-white">{data.overview?.totalInitiatives || 0}</p>
                      </div>
                      <div className="p-3 bg-blue-500/20 rounded-full">
                        <Target className="h-6 w-6 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm font-medium">Total Areas</p>
                        <p className="text-2xl font-bold text-white">{data.overview?.totalAreas || 0}</p>
                      </div>
                      <div className="p-3 bg-green-500/20 rounded-full">
                        <Building2 className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm font-medium">Active Users</p>
                        <p className="text-2xl font-bold text-white">{data.overview?.totalUsers || 0}</p>
                      </div>
                      <div className="p-3 bg-purple-500/20 rounded-full">
                        <Users className="h-6 w-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm font-medium">Avg Progress</p>
                        <p className="text-2xl font-bold text-white">{data.overview?.averageProgress || 0}%</p>
                      </div>
                      <div className="p-3 bg-orange-500/20 rounded-full">
                        <Activity className="h-6 w-6 text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Initiative Status
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Distribution of initiative statuses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.overview?.initiativesByStatus ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-white/80">Completed</span>
                          </div>
                          <span className="text-white font-medium">{data.overview.initiativesByStatus.completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span className="text-white/80">In Progress</span>
                          </div>
                          <span className="text-white font-medium">{data.overview.initiativesByStatus.in_progress}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-yellow-400" />
                            <span className="text-white/80">Planning</span>
                          </div>
                          <span className="text-white font-medium">{data.overview.initiativesByStatus.planning}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span className="text-white/80">On Hold</span>
                          </div>
                          <span className="text-white font-medium">{data.overview.initiativesByStatus.on_hold}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-white/40 mx-auto mb-4" />
                        <p className="text-white/70">No status data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Performance Metrics
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Key performance indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.performance ? (
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/80 text-sm">Completion Rate</span>
                            <span className="text-white font-medium">{formatPercentage(data.performance.completionRate)}</span>
                          </div>
                          <Progress value={data.performance.completionRate} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/80 text-sm">On-Time Completion</span>
                            <span className="text-white font-medium">{formatPercentage(data.performance.onTimeCompletionRate)}</span>
                          </div>
                          <Progress value={data.performance.onTimeCompletionRate} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-white/80 text-sm">Avg Time to Complete</span>
                          <span className="text-white font-medium">{formatDays(data.performance.averageTimeToCompletion)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-white/40 mx-auto mb-4" />
                        <p className="text-white/70">No performance data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Area Performance */}
              {data.performance?.areaPerformance && data.performance.areaPerformance.length > 0 && (
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      Area Performance
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Performance comparison across areas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.performance.areaPerformance.slice(0, 5).map((area) => (
                        <div key={area.areaId} className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{area.areaName}</h4>
                            <p className="text-sm text-white/70">
                              {area.totalInitiatives} initiatives • {area.completedInitiatives} completed
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-white">{formatPercentage(area.completionRate)}</p>
                            <p className="text-sm text-white/70">completion rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      </div>
    </ProtectedRoute>
  )
}