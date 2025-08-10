"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity,
  Layers,
  ArrowRight
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"

const analyticsRoutes = [
  {
    title: "Area Comparison",
    description: "Compare performance metrics across business areas",
    href: "/dashboard/analytics/area-comparison",
    icon: Layers,
    color: "from-blue-600/30 to-blue-800/20",
    borderColor: "border-blue-500/20",
  },
  {
    title: "Progress Distribution",
    description: "Analyze the distribution of progress across initiatives",
    href: "/dashboard/analytics/progress-distribution",
    icon: PieChart,
    color: "from-green-600/30 to-green-800/20",
    borderColor: "border-green-500/20",
  },
  {
    title: "Status Distribution",
    description: "View status breakdown of all initiatives",
    href: "/dashboard/analytics/status-distribution",
    icon: Activity,
    color: "from-purple-600/30 to-purple-800/20",
    borderColor: "border-purple-500/20",
  },
  {
    title: "Trend Analytics",
    description: "Track progress trends and performance over time",
    href: "/dashboard/analytics/trend-analytics",
    icon: TrendingUp,
    color: "from-orange-600/30 to-orange-800/20",
    borderColor: "border-orange-500/20",
  },
]

export default function AnalyticsOverview() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics Overview</h1>
          <p className="text-gray-400 mt-2">
            Gain insights into your strategic performance with comprehensive analytics
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analyticsRoutes.map((route) => {
            const Icon = route.icon
            return (
              <Card
                key={route.href}
                className={`bg-gradient-to-br ${route.color} backdrop-blur-sm border ${route.borderColor} hover:border-white/20 transition-all group`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-8 w-8 text-white" />
                      <div>
                        <CardTitle className="text-xl text-white">
                          {route.title}
                        </CardTitle>
                        <p className="text-sm text-gray-300 mt-1">
                          {route.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={route.href}>
                    <Button
                      variant="outline"
                      className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    >
                      View Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Stats Overview */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-white">Analytics Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">4</p>
                <p className="text-sm text-gray-400">Analytics Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">Real-time</p>
                <p className="text-sm text-gray-400">Data Updates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">Interactive</p>
                <p className="text-sm text-gray-400">Visualizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}