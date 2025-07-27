"use client"
import { useState, useEffect } from 'react'
import { RoleNavigation } from "@/components/role-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Target, TrendingUp } from "lucide-react"
import { getThemeFromDomain, generateThemeCSS } from '@/lib/theme-config'
import { AuthGuard } from '@/lib/auth-guard'

export default function DashboardPage() {
  const [theme, setTheme] = useState<any>(null)

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

  return (
    <AuthGuard>
      <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <RoleNavigation />
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-white/70">Welcome to your management dashboard</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">124</div>
                <p className="text-xs text-white/70">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Target className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-white/70">8 completed this week</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-white/70">+5% improvement</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                <BarChart3 className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2K</div>
                <p className="text-xs text-white/70">Monthly active users</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription className="text-white/70">Latest updates and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm">New user registered</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm">Project milestone completed</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm">System maintenance scheduled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription className="text-white/70">Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
                    Create Project
                  </button>
                  <button className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
                    Add User
                  </button>
                  <button className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
                    View Reports
                  </button>
                  <button className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm">
                    Settings
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  )
}