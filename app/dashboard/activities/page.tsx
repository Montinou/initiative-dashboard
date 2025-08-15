"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { logger } from "@/lib/logger"
import { useActivities } from "@/hooks/useActivities"
import { ActivityFormModal } from "@/components/modals"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Activity,
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Plus,
  Filter,
  ChevronRight
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { TableLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import { SimpleFilterBar } from "@/components/filters/SimpleFilterBar"
import { useEnhancedFilters } from "@/hooks/useFilters"
import { useTranslations } from 'next-intl'
import { useLocale } from '@/hooks/useLocale'

interface ActivityWithRelations {
  id: string
  title: string
  description?: string
  is_completed: boolean
  assigned_to?: string
  initiative?: {
    id: string
    title: string
    area_id?: string
  }
  assigned_to_user?: {
    id: string
    full_name: string
    email: string
  }
}

function ActivityItem({ 
  activity, 
  onToggle,
  locale,
  t 
}: { 
  activity: ActivityWithRelations
  onToggle: (id: string, isCompleted: boolean) => void
  locale: string
  t: any 
}) {
  return (
    <Card className={cn(
      "bg-gray-900/50 backdrop-blur-sm border border-white/10 transition-all",
      activity.is_completed && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={activity.is_completed}
            onCheckedChange={() => onToggle(activity.id, activity.is_completed)}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className={cn(
                  "text-sm font-medium text-white",
                  activity.is_completed && "line-through"
                )}>
                  {activity.title}
                </h4>
                {activity.description && (
                  <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  activity.is_completed 
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                )}
              >
                {activity.is_completed ? t('dashboard.status.completed') : t('dashboard.activities.inProgress')}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {activity.initiative && (
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <span>{activity.initiative.title}</span>
                </div>
              )}
              {activity.assigned_to_user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{activity.assigned_to_user.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivitiesContent() {
  const t = useTranslations()
  const { locale } = useLocale()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { activities, loading: isLoading, error, toggleActivityCompletion, createActivity } = useActivities()
  const { profile } = useAuth()
  
  // Enhanced filtering
  const {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
    applyFilters
  } = useEnhancedFilters()
  
  
  const isCEOOrAdmin = profile?.role === 'CEO' || profile?.role === 'Admin'
  const isManager = profile?.role === 'Manager'
  const canCreateActivity = isCEOOrAdmin || isManager

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    await toggleActivityCompletion(id, !isCompleted)
  }
  
  const handleSaveActivity = async (data: any) => {
    try {
      await createActivity(data)
      setShowCreateModal(false)
      window.location.reload()
    } catch (error) {
      logger.error('Error saving activity:', error)
      throw error
    }
  }

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={AlertTriangle}
          title={t('dashboard.activities.unableToLoad')}
          description={t('dashboard.activities.unableToLoadDescription')}
          action={{
            label: t('common.refresh'),
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">{t('dashboard.activities.title')}</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  // Apply filters to activities - remove useMemo to avoid hook ordering issues
  let filteredActivities: ActivityWithRelations[] = []
  
  if (activities) {
    // Map activities to have properties that filters expect
    const mappedActivities = activities.map((activity: ActivityWithRelations) => ({
      ...activity,
      initiative_id: activity.initiative?.id,
      area_id: activity.initiative?.area_id,
      status: activity.is_completed ? 'completed' : 'in_progress',
      progress: activity.is_completed ? 100 : 0
    }))
    
    // Apply additional activity-specific filters
    let filtered = applyFilters(mappedActivities)
    
    // Filter by completion status if specified
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(activity => {
        if (filters.statuses.includes('completed')) {
          return activity.is_completed
        }
        if (filters.statuses.includes('in_progress') || filters.statuses.includes('planning')) {
          return !activity.is_completed
        }
        return true
      })
    }
    
    // Filter by initiative if specified
    if (filters.initiativeIds.length > 0) {
      filtered = filtered.filter(activity => 
        activity.initiative && filters.initiativeIds.includes(activity.initiative.id)
      )
    }
    
    filteredActivities = filtered
  }
  
  const completedActivities = filteredActivities.filter((a: any) => a.is_completed)
  const pendingActivities = filteredActivities.filter((a: any) => !a.is_completed)
  const completionRate = filteredActivities.length > 0 
    ? Math.round((completedActivities.length / filteredActivities.length) * 100)
    : 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Actividades</h1>
            <p className="text-gray-400 mt-2">
              {t('dashboard.activities.subtitle')}
            </p>
          </div>
          {canCreateActivity && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.activities.new')}
            </Button>
          )}
        </div>
        
        {/* Filter Bar */}
        <SimpleFilterBar
          filters={filters}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
          activeFilterCount={getActiveFilterCount()}
          entityType="activities"
          showProgressFilter={false} // Activities use completion status instead
          showStatusFilter={true} // Shows completed/in_progress
          showPriorityFilter={false} // Activities don't have priority
          showSearchFilter={true}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('dashboard.activities.total')}</p>
                  <p className="text-2xl font-bold text-white">{filteredActivities.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/20 backdrop-blur-sm border border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('dashboard.activities.pending')}</p>
                  <p className="text-2xl font-bold text-white">{pendingActivities.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('dashboard.activities.completed')}</p>
                  <p className="text-2xl font-bold text-white">{completedActivities.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-sm border border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('dashboard.activities.completion')}</p>
                  <p className="text-2xl font-bold text-white">{completionRate}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <div className="space-y-6">
          {/* Pending Activities */}
          {pendingActivities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">{t('dashboard.activities.pendingActivities')}</h2>
              <div className="space-y-2">
                {pendingActivities.map((activity) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity}
                    onToggle={handleToggleComplete}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Activities */}
          {completedActivities.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">{t('dashboard.activities.completedActivities')}</h2>
              <div className="space-y-2">
                {completedActivities.map((activity) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity}
                    onToggle={handleToggleComplete}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredActivities.length === 0 && activities.length > 0 && (
            <EmptyState
              icon={Activity}
              title={t('dashboard.activities.noMatchingFilters')}
              description={t('dashboard.activities.noMatchingFiltersDescription')}
              action={{
                label: t('dashboard.activities.clearFilters'),
                onClick: resetFilters
              }}
            />
          )}
          {activities.length === 0 && (
            <EmptyState
              icon={Activity}
              title={t('dashboard.activities.noActivities')}
              description={t('dashboard.activities.noActivitiesDescription')}
              action={canCreateActivity ? {
                label: t('dashboard.activities.createActivity'),
                onClick: () => setShowCreateModal(true)
              } : undefined}
            />
          )}
        </div>
      </div>
      
      {/* Activity Form Modal */}
      {canCreateActivity && (
        <ActivityFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveActivity}
          locale={locale}
        />
      )}
    </ErrorBoundary>
  )
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Actividades</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    }>
      <ActivitiesContent />
    </Suspense>
  )
}