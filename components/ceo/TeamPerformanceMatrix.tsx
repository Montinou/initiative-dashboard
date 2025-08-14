"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users,
  TrendingUp,
  Award,
  Target,
  Activity,
  ChevronUp,
  ChevronDown,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  role: string
  area: string
  avatar?: string
  performance_score: number
  initiatives_count: number
  completed_initiatives: number
  avg_progress: number
  on_time_delivery: number
  quality_score: number
  trend: 'up' | 'down' | 'stable'
  rank_change?: number
}

interface AreaPerformance {
  id: string
  name: string
  manager: string
  team_size: number
  avg_performance: number
  total_initiatives: number
  completed_initiatives: number
  on_track_percentage: number
  efficiency_score: number
}

interface TeamPerformanceMatrixProps {
  teamData?: {
    members: TeamMember[]
    areas: AreaPerformance[]
  }
  loading: boolean
  className?: string
}

export function TeamPerformanceMatrix({ 
  teamData, 
  loading,
  className 
}: TeamPerformanceMatrixProps) {
  const [viewMode, setViewMode] = useState<'individual' | 'area'>('individual')
  const [sortBy, setSortBy] = useState<'performance' | 'progress' | 'delivery'>('performance')

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="glassmorphic-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mock data if none provided
  const mockMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Area Manager',
      area: 'Sales',
      performance_score: 92,
      initiatives_count: 8,
      completed_initiatives: 6,
      avg_progress: 85,
      on_time_delivery: 88,
      quality_score: 94,
      trend: 'up',
      rank_change: 2
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'Area Manager',
      area: 'Engineering',
      performance_score: 89,
      initiatives_count: 12,
      completed_initiatives: 9,
      avg_progress: 78,
      on_time_delivery: 82,
      quality_score: 91,
      trend: 'stable',
      rank_change: 0
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      role: 'Area Manager',
      area: 'Marketing',
      performance_score: 87,
      initiatives_count: 6,
      completed_initiatives: 5,
      avg_progress: 82,
      on_time_delivery: 90,
      quality_score: 88,
      trend: 'up',
      rank_change: 1
    },
    {
      id: '4',
      name: 'David Kim',
      role: 'Area Manager',
      area: 'Operations',
      performance_score: 84,
      initiatives_count: 10,
      completed_initiatives: 7,
      avg_progress: 72,
      on_time_delivery: 75,
      quality_score: 86,
      trend: 'down',
      rank_change: -1
    },
    {
      id: '5',
      name: 'Lisa Thompson',
      role: 'Area Manager',
      area: 'HR',
      performance_score: 91,
      initiatives_count: 5,
      completed_initiatives: 4,
      avg_progress: 88,
      on_time_delivery: 95,
      quality_score: 92,
      trend: 'up',
      rank_change: 3
    }
  ]

  const mockAreas: AreaPerformance[] = [
    {
      id: '1',
      name: 'Sales',
      manager: 'Sarah Johnson',
      team_size: 25,
      avg_performance: 88,
      total_initiatives: 8,
      completed_initiatives: 6,
      on_track_percentage: 85,
      efficiency_score: 92
    },
    {
      id: '2',
      name: 'Engineering',
      manager: 'Michael Chen',
      team_size: 40,
      avg_performance: 85,
      total_initiatives: 12,
      completed_initiatives: 9,
      on_track_percentage: 78,
      efficiency_score: 87
    },
    {
      id: '3',
      name: 'Marketing',
      manager: 'Emily Rodriguez',
      team_size: 15,
      avg_performance: 86,
      total_initiatives: 6,
      completed_initiatives: 5,
      on_track_percentage: 88,
      efficiency_score: 90
    },
    {
      id: '4',
      name: 'Operations',
      manager: 'David Kim',
      team_size: 30,
      avg_performance: 82,
      total_initiatives: 10,
      completed_initiatives: 7,
      on_track_percentage: 72,
      efficiency_score: 80
    },
    {
      id: '5',
      name: 'HR',
      manager: 'Lisa Thompson',
      team_size: 10,
      avg_performance: 90,
      total_initiatives: 5,
      completed_initiatives: 4,
      on_track_percentage: 92,
      efficiency_score: 94
    }
  ]

  const members = teamData?.members || mockMembers
  const areas = teamData?.areas || mockAreas

  // Sort members based on selected criteria
  const sortedMembers = [...members].sort((a, b) => {
    switch(sortBy) {
      case 'performance':
        return b.performance_score - a.performance_score
      case 'progress':
        return b.avg_progress - a.avg_progress
      case 'delivery':
        return b.on_time_delivery - a.on_time_delivery
      default:
        return 0
    }
  })

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 80) return 'text-blue-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getTrendIcon = (trend: string, change?: number) => {
    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 text-green-400">
          <ChevronUp className="h-4 w-4" />
          {change && <span className="text-xs">+{change}</span>}
        </div>
      )
    }
    if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 text-red-400">
          <ChevronDown className="h-4 w-4" />
          {change && <span className="text-xs">{change}</span>}
        </div>
      )
    }
    return <div className="text-gray-400 text-xs">-</div>
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* View Mode Selector */}
      <Card className="glassmorphic-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance Matrix
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                <Button
                  size="sm"
                  variant={viewMode === 'individual' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('individual')}
                  className="text-xs"
                >
                  Individual
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'area' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('area')}
                  className="text-xs"
                >
                  By Area
                </Button>
              </div>
              
              {viewMode === 'individual' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="glassmorphic-input text-xs px-3 py-1"
                >
                  <option value="performance">Performance Score</option>
                  <option value="progress">Progress</option>
                  <option value="delivery">On-Time Delivery</option>
                </select>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'individual' ? (
        /* Individual Performance View */
        <div className="space-y-4">
          {sortedMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="glassmorphic-card hover:bg-white/5 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Left: Rank & Member Info */}
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          #{index + 1}
                        </div>
                        {getTrendIcon(member.trend, member.rank_change)}
                      </div>
                      
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="text-white font-medium">{member.name}</h3>
                        <p className="text-sm text-gray-400">{member.role} • {member.area}</p>
                      </div>
                    </div>

                    {/* Center: Metrics */}
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Performance</p>
                        <p className={cn("text-2xl font-bold", getPerformanceColor(member.performance_score))}>
                          {member.performance_score}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Initiatives</p>
                        <p className="text-lg text-white">
                          {member.completed_initiatives}/{member.initiatives_count}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Avg Progress</p>
                        <div className="flex items-center gap-2">
                          <Progress value={member.avg_progress} className="w-20 h-2" />
                          <span className="text-sm text-white">{member.avg_progress}%</span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400">On-Time</p>
                        <p className="text-lg text-white">{member.on_time_delivery}%</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Quality</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-white">{member.quality_score}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <Button size="sm" variant="outline" className="glassmorphic-button-ghost">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Area Performance View */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map((area, index) => (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="glassmorphic-card hover:scale-[1.02] transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">{area.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {area.team_size} members
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">Manager: {area.manager}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Performance Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Avg Performance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={area.avg_performance} className="w-24 h-2" />
                        <span className={cn("text-sm font-bold", getPerformanceColor(area.avg_performance))}>
                          {area.avg_performance}%
                        </span>
                      </div>
                    </div>

                    {/* Initiatives */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Initiatives</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-white">
                          {area.completed_initiatives}/{area.total_initiatives}
                        </span>
                      </div>
                    </div>

                    {/* On Track */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">On Track</span>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-white">{area.on_track_percentage}%</span>
                      </div>
                    </div>

                    {/* Efficiency */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Efficiency</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-white">{area.efficiency_score}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <Button size="sm" className="w-full glassmorphic-button">
                        View Area Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <Card className="glassmorphic-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400 mb-1">Top Performer</p>
              <p className="text-sm text-white font-medium">
                {sortedMembers[0]?.name || 'N/A'}
              </p>
              <p className="text-lg text-green-400 font-bold">
                {sortedMembers[0]?.performance_score || 0}
              </p>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400 mb-1">Avg Performance</p>
              <p className="text-2xl text-white font-bold">
                {Math.round(members.reduce((acc, m) => acc + m.performance_score, 0) / members.length)}
              </p>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400 mb-1">Total Initiatives</p>
              <p className="text-2xl text-white font-bold">
                {members.reduce((acc, m) => acc + m.initiatives_count, 0)}
              </p>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400 mb-1">Completion Rate</p>
              <p className="text-2xl text-green-400 font-bold">
                {Math.round(
                  (members.reduce((acc, m) => acc + m.completed_initiatives, 0) / 
                   members.reduce((acc, m) => acc + m.initiatives_count, 0)) * 100
                )}%
              </p>
            </div>
            
            <div className="text-center p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400 mb-1">Avg Quality</p>
              <p className="text-2xl text-yellow-400 font-bold">
                {Math.round(members.reduce((acc, m) => acc + m.quality_score, 0) / members.length)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}