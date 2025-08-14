"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple static component without any hooks that could cause issues
function SimpleInitiativeCard({ initiative }: { initiative: any }) {
  const statusConfig = {
    planning: { label: "Planning", color: "text-gray-400", icon: Clock, bgColor: "bg-gray-500/10" },
    in_progress: { label: "In Progress", color: "text-blue-500", icon: Clock, bgColor: "bg-blue-500/10" },
    completed: { label: "Completed", color: "text-green-500", icon: CheckCircle2, bgColor: "bg-green-500/10" },
    on_hold: { label: "On Hold", color: "text-yellow-500", icon: AlertTriangle, bgColor: "bg-yellow-500/10" },
  }

  const status = initiative.status || 'planning'
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning
  const StatusIcon = config.icon

  // Format date for display
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'No date set'
    try {
      return new Date(date).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return date
    }
  }

  // Calculate if at risk (due date within 7 days and not completed)
  const isAtRisk = () => {
    if (!initiative.due_date || status === 'completed') return false
    const dueDate = new Date(initiative.due_date)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue <= 7 && daysUntilDue >= 0
  }

  const atRisk = isAtRisk()

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-lg text-white">
            {initiative.title || 'Untitled Initiative'}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{initiative.area_name || initiative.area?.name || 'Unknown Area'}</span>
            <span>•</span>
            <span>{initiative.created_by_name || initiative.created_by_user?.full_name || 'Unassigned'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {initiative.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{initiative.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", config.color)} />
            <Badge variant="outline" className={cn(config.bgColor, config.color, "border-current/20")}>
              {config.label}
            </Badge>
          </div>
          {atRisk && (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              At Risk
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">
              {initiative.calculated_progress ?? initiative.progress ?? 0}%
            </span>
          </div>
          <Progress 
            value={initiative.calculated_progress ?? initiative.progress ?? 0} 
            className="h-2" 
          />
        </div>

        {initiative.activity_stats && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Activities</span>
            <span className="text-white">
              {initiative.activity_stats.completed}/{initiative.activity_stats.total}
            </span>
          </div>
        )}

        <div className="space-y-1 text-sm text-gray-400">
          {initiative.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Started: {formatDate(initiative.start_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Due: {formatDate(initiative.due_date)}</span>
          </div>
        </div>

        {initiative.objectives && initiative.objectives.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-1">Linked Objectives:</p>
            <div className="flex flex-wrap gap-1">
              {initiative.objectives.slice(0, 2).map((obj: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {obj.title}
                </Badge>
              ))}
              {initiative.objectives.length > 2 && (
                <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/20">
                  +{initiative.objectives.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function SimpleInitiativesPage() {
  const [initiatives, setInitiatives] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Simple fetch without any complex logic
    fetch('/api/initiatives', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        setInitiatives(data.initiatives || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading initiatives:', err)
        setError('Failed to load initiatives')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Iniciativas</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Iniciativas</h1>
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const activeCount = initiatives.filter(i => i.status === 'in_progress' || i.status === 'planning').length
  const completedCount = initiatives.filter(i => i.status === 'completed').length
  const onHoldCount = initiatives.filter(i => i.status === 'on_hold').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Iniciativas</h1>
        <p className="text-gray-400 mt-2">
          Gestiona y rastrea el progreso de todas las iniciativas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-white">{activeCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-white">{completedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/20 backdrop-blur-sm border border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">On Hold</p>
                <p className="text-2xl font-bold text-white">{onHoldCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives Grid */}
      {initiatives.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {initiatives.map((initiative) => (
            <SimpleInitiativeCard key={initiative.id} initiative={initiative} />
          ))}
        </div>
      ) : (
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-12 text-center">
            <p className="text-gray-400">No initiatives found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}