"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle2, AlertTriangle, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl'
import { useLocale } from '@/hooks/useLocale'
import { useAuth } from "@/lib/auth-context"

// Simple static component without any hooks that could cause issues
function SimpleInitiativeCard({ initiative, locale, t }: { initiative: any, locale: string, t: any }) {
  const statusConfig = {
    planning: { 
      label: t('dashboard.status.planning'), 
      color: "text-gray-400", 
      icon: Clock, 
      bgColor: "bg-gray-500/10" 
    },
    in_progress: { 
      label: t('dashboard.status.in_progress'), 
      color: "text-blue-500", 
      icon: Clock, 
      bgColor: "bg-blue-500/10" 
    },
    completed: { 
      label: t('dashboard.status.completed'), 
      color: "text-green-500", 
      icon: CheckCircle2, 
      bgColor: "bg-green-500/10" 
    },
    on_hold: { 
      label: t('dashboard.status.on_hold'), 
      color: "text-yellow-500", 
      icon: AlertTriangle, 
      bgColor: "bg-yellow-500/10" 
    },
  }

  const status = initiative.status || 'planning'
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning
  const StatusIcon = config.icon

  // Format date for display
  const formatDate = (date: string | null | undefined) => {
    if (!date) return t('dashboard.initiatives.noDateSet')
    try {
      return new Date(date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { 
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
            {initiative.title || t('dashboard.initiatives.untitledInitiative')}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{initiative.area_name || initiative.area?.name || t('dashboard.initiatives.unknownArea')}</span>
            <span>•</span>
            <span>{initiative.created_by_name || initiative.created_by_user?.full_name || t('dashboard.initiatives.unassigned')}</span>
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
              {t('dashboard.initiatives.atRisk')}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{t('dashboard.initiatives.progress')}</span>
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
            <span className="text-gray-400">{t('dashboard.initiatives.activities')}</span>
            <span className="text-white">
              {initiative.activity_stats.completed}/{initiative.activity_stats.total}
            </span>
          </div>
        )}

        <div className="space-y-1 text-sm text-gray-400">
          {initiative.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{t('dashboard.initiatives.started')}: {formatDate(initiative.start_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{t('dashboard.initiatives.due')}: {formatDate(initiative.due_date)}</span>
          </div>
        </div>

        {initiative.objectives && initiative.objectives.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-1">{t('dashboard.initiatives.linkedObjectives')}:</p>
            <div className="flex flex-wrap gap-1">
              {initiative.objectives.slice(0, 2).map((obj: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {obj.title}
                </Badge>
              ))}
              {initiative.objectives.length > 2 && (
                <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-400 border-gray-500/20">
                  +{initiative.objectives.length - 2} {t('dashboard.initiatives.more')}
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
  const t = useTranslations()
  const { locale } = useLocale()
  const { profile, loading: authLoading, user } = useAuth()
  const [initiatives, setInitiatives] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Don't render until auth is initialized
  if (authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.initiatives.title')}</h1>
        <p className="text-gray-400">Cargando autenticación...</p>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user || !profile) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  React.useEffect(() => {
    // Only fetch when auth is complete
    if (!authLoading && user && profile) {
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
          setError(t('dashboard.initiatives.failedToLoad'))
          setLoading(false)
        })
    }
  }, [t, authLoading, user, profile])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.initiatives.title')}</h1>
        <p className="text-gray-400">{t('dashboard.initiatives.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.initiatives.title')}</h1>
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
        <h1 className="text-3xl font-bold text-white">{t('dashboard.initiatives.title')}</h1>
        <p className="text-gray-400 mt-2">
          {t('dashboard.initiatives.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('dashboard.initiatives.active')}</p>
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
                <p className="text-sm text-gray-400">{t('dashboard.initiatives.completed')}</p>
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
                <p className="text-sm text-gray-400">{t('dashboard.initiatives.onHold')}</p>
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
            <SimpleInitiativeCard 
              key={initiative.id} 
              initiative={initiative} 
              locale={locale}
              t={t}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-12 text-center">
            <p className="text-gray-400">{t('dashboard.initiatives.noInitiatives')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}