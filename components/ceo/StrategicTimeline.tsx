"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Calendar,
  Target,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Objective {
  id: string
  title: string
  description?: string
  progress: number
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  priority: 'high' | 'medium' | 'low'
  start_date: string
  end_date: string
  area_name?: string
  initiatives?: Array<{
    id: string
    title: string
    progress: number
  }>
}


interface StrategicTimelineProps {
  objectives: Objective[]
  loading: boolean
  className?: string
}

export function StrategicTimeline({ 
  objectives, 
  loading,
  className 
}: StrategicTimelineProps) {
  const [expandedObjective, setExpandedObjective] = useState<string | null>(null)

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card >
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredObjectives = objectives

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-green-500 bg-green-500/10 border-green-500/30'
      case 'in_progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
      case 'planning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
      case 'overdue': return 'text-red-500 bg-red-500/10 border-red-500/30'
      default: return 'text-muted-foreground bg-gray-500/10 border-gray-500/30'
    }
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-500/20 text-red-300 border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-300 border-green-500/30'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Strategic Timeline
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 mb-6">
          </div>
          </div>

          {/* Timeline View */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent" />

            {/* Objectives */}
            <div className="space-y-4">
              {filteredObjectives.map((objective, index) => (
                <motion.div
                  key={objective.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline Node */}
                  <div className={cn(
                    "absolute left-6 w-4 h-4 rounded-full border-2",
                    getStatusColor(objective.status),
                    "bg-gray-900"
                  )} />

                  {/* Objective Card */}
                  <div className="ml-16">
                    <Card 
                      className={cn(
                        "hover:bg-muted transition-all cursor-pointer",
                        expandedObjective === objective.id && "ring-2 ring-primary/50"
                      )}
                      onClick={() => setExpandedObjective(
                        expandedObjective === objective.id ? null : objective.id
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-foreground font-medium">
                                  {objective.title}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getPriorityBadge(objective.priority))}
                                >
                                  {objective.priority}
                                </Badge>
                              </div>
                              {objective.description && (
                                <p className="text-sm text-muted-foreground">
                                  {objective.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              expandedObjective === objective.id && "rotate-90"
                            )} />
                          </div>

                          {/* Progress and Dates */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(objective.start_date).toLocaleDateString()} - {new Date(objective.end_date).toLocaleDateString()}
                                </span>
                              </div>
                              {objective.area_name && (
                                <Badge variant="outline" className="text-xs">
                                  {objective.area_name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={objective.progress} className="w-24 h-2" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {objective.progress}%
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {expandedObjective === objective.id && objective.initiatives && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pt-3 border-t border-border"
                            >
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium mb-2">
                                  Related Initiatives ({objective.initiatives.length})
                                </p>
                                {objective.initiatives.map((initiative) => (
                                  <div 
                                    key={initiative.id}
                                    className="flex items-center justify-between p-2 rounded bg-muted"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Target className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">
                                        {initiative.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={initiative.progress} className="w-16 h-1.5" />
                                      <span className="text-xs text-muted-foreground">
                                        {initiative.progress}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="<CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {objectives.filter(o => o.status === 'completed').length}
                </p>
              </CardContent>
            </Card>

            <Card className="<CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">In Progress</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {objectives.filter(o => o.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>

            <Card className="<CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Planning</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {objectives.filter(o => o.status === 'planning').length}
                </p>
              </CardContent>
            </Card>

            <Card className="<CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {objectives.filter(o => o.status === 'overdue').length}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}