"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Activity,
  Calendar,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react'

interface DashboardMetric {
  title: string
  value: string | number
  change: number
  icon: React.ElementType
}

const metrics: DashboardMetric[] = [
  { title: 'Total Initiatives', value: 24, change: 12, icon: Target },
  { title: 'Active Users', value: 142, change: 8, icon: Users },
  { title: 'Completion Rate', value: '78%', change: 5, icon: TrendingUp },
  { title: 'Weekly Activity', value: 389, change: -3, icon: Activity },
]

export function ThemedDashboardLayout() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark')

  // Use standard shadcn colors

  return (
    <div className="min-h-screen transition-all duration-500 bg-background">
      {/* Header */}
      <header className={cn(
        "border-b px-6 py-4",
        "bg-card border-border"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Initiative Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Current theme: {theme}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className=""
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <Card 
                key={index}
                className="transition-all duration-300 hover:scale-105 bg-card border border-border"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center text-xs mt-2">
                    <TrendingUp className={cn(
                      "h-3 w-3 mr-1",
                      metric.change > 0 ? "text-green-500" : "text-red-500"
                    )} />
                    <span className={metric.change > 0 ? "text-green-500" : "text-red-500"}>
                      {Math.abs(metric.change)}%
                    </span>
                    <span className="text-muted-foreground ml-1">from last week</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Progress Chart */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle>Quarterly Progress</CardTitle>
                  <CardDescription>Track your objectives completion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Q1 Objectives</span>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Q2 Objectives</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Q3 Objectives</span>
                      <span className="text-sm font-medium">12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates from your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center gap-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>U{item}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">User {item}</span> updated initiative
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item} hours ago
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Initiatives List */}
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Active Initiatives</CardTitle>
                <CardDescription>Your current focus areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { title: 'Customer Portal Redesign', status: 'in-progress', progress: 65 },
                    { title: 'API Documentation', status: 'planning', progress: 20 },
                    { title: 'Mobile App Launch', status: 'in-progress', progress: 80 },
                  ].map((initiative, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{initiative.title}</span>
                          <Badge 
                            variant={initiative.status === 'in-progress' ? 'default' : 'secondary'}
                            className=""
                          >
                            {initiative.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {initiative.progress}%
                        </span>
                      </div>
                      <Progress value={initiative.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="initiatives">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>All Initiatives</CardTitle>
                <CardDescription>Comprehensive view of all initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Initiative content would go here...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Team Overview</CardTitle>
                <CardDescription>Manage your team members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Team management content would go here...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Deep dive into your metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics content would go here...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}