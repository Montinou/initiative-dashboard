"use client"

import React, { useState, useEffect, useMemo } from "react"
import { logger } from "@/lib/logger"
import { useObjectives } from "@/hooks/useObjectives"
import { useInitiatives } from "@/hooks/useInitiatives"
import { useSearchParams } from "@/hooks/useSearchParams"
import { ObjectiveFormModal } from "@/components/modals"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Plus,
  ChevronRight,
  Zap,
  Edit,
  Search,
  Filter
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { TableLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ObjectiveWithRelations } from "@/lib/types/database"
import { FilterContainer } from "@/components/filters/FilterContainer"
import { useEnhancedFilters } from "@/hooks/useFilters"
import { DateRangeFilter } from "@/components/filters/DateRangeFilter"
import { AreaFilter } from "@/components/filters/AreaFilter"
import { StatusFilter } from "@/components/filters/StatusFilter"
import { PriorityFilter } from "@/components/filters/PriorityFilter"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from 'next-intl'
import { useLocale } from '@/hooks/useLocale'

function ObjectiveCard({ 
  objective, 
  linkedInitiatives,
  onEdit,
  locale 
}: { 
  objective: ObjectiveWithRelations; 
  linkedInitiatives: any[];
  onEdit?: (objective: ObjectiveWithRelations) => void;
  locale: string 
}) {
  // Calculate progress based on linked initiatives passed as prop
  const totalInitiatives = linkedInitiatives.length;
  const avgProgress = totalInitiatives > 0
    ? Math.round(
        linkedInitiatives.reduce((acc, init) => acc + (init.progress || 0), 0) / totalInitiatives
      )
    : 0;

  // Get date range display
  const dateRangeDisplay = objective.start_date && objective.end_date 
    ? `${new Date(objective.start_date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')} - ${new Date(objective.end_date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}`
    : objective.start_date 
      ? `${tCommon('from')} ${new Date(objective.start_date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}`
      : t('common.noDatesSet');

  return (
    <Card className="bg-card/50 backdrop-blur-sm border border-border hover:border-accent transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-foreground">{objective.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{objective.area?.name || t('common.noArea')}</span>
              <span>•</span>
              <span>{dateRangeDisplay}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(objective)}>
                <Edit className="h-4 w-4 mr-2" />
                {locale === 'es' ? 'Editar' : 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem>{locale === 'es' ? 'Ver Iniciativas' : 'View Initiatives'}</DropdownMenuItem>
              <DropdownMenuItem>{locale === 'es' ? 'Archivar' : 'Archive'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {objective.description && (
          <p className="text-sm text-muted-foreground">{objective.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">
              {totalInitiatives} {totalInitiatives === 1 
                ? (locale === 'es' ? "Iniciativa" : "Initiative") 
                : (locale === 'es' ? "Iniciativas" : "Initiatives")}
            </span>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {locale === 'es' ? 'Activo' : 'Active'}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{locale === 'es' ? 'Progreso Promedio' : 'Average Progress'}</span>
            <span className="text-foreground font-medium">{avgProgress}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>

        {/* Show linked initiatives preview */}
        {linkedInitiatives.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{locale === 'es' ? 'Iniciativas Vinculadas' : 'Linked Initiatives'}</p>
            <div className="space-y-1">
              {linkedInitiatives.slice(0, 3).map((init) => (
                <div key={init.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80 truncate">{init.title}</span>
                  <span className="text-muted-foreground">{init.progress}%</span>
                </div>
              ))}
              {linkedInitiatives.length > 3 && (
                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  {locale === 'es' ? 'Ver todas' : 'View all'} {linkedInitiatives.length} {locale === 'es' ? 'iniciativas' : 'initiatives'}
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ObjectivesPage() {
  const { profile, loading: authLoading, user } = useAuth()
  const t = useTranslations()
  const tCommon = useTranslations('common')
  const { locale } = useLocale()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingObjective, setEditingObjective] = useState<ObjectiveWithRelations | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Don't render until auth is initialized
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.objectives.title')}</h1>
        </div>
        <TableLoadingSkeleton />
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
  
  // Read URL parameters
  const { useinitiatives, include_initiatives, isLoaded: urlParamsLoaded } = useSearchParams()
  
  // Initialize enhanced filters for objectives page
  const { filters, updateFilters, applyFilters, toQueryParams, resetFilters, getActiveFilterCount } = useEnhancedFilters({
    persistToUrl: true,
    persistToLocalStorage: true
  })
  
  // Convert filters to query params for API call
  const queryParams = toQueryParams()
  
  // Determine if initiatives should be included based on URL parameters
  // Default to true to always show initiatives with objectives
  const shouldIncludeInitiatives = useinitiatives || include_initiatives
  
  const queryString = new URLSearchParams({
    ...queryParams,
    include_initiatives: shouldIncludeInitiatives.toString(),
    useinitiatives: shouldIncludeInitiatives.toString()
  } as any).toString()
  
  // Fetch objectives (without initiatives, we'll get them separately)
  const { objectives, loading: objectivesLoading, error, createObjective, updateObjective } = useObjectives({ 
    ...queryParams,
    include_initiatives: false,  // Don't include initiatives in objectives API
    useinitiatives: false
  })
  
  // Fetch initiatives separately to process them
  const { initiatives, loading: initiativesLoading } = useInitiatives()
  
  // Combine loading states - both must be loaded
  const isLoading = objectivesLoading || initiativesLoading
  
  // Process initiatives to map them to objectives
  const objectivesWithInitiatives = useMemo(() => {
    // Only process if both data sets are available and not loading
    if (!objectives || !initiatives || isLoading) return []
    
    return objectives.map(objective => {
      // Find all initiatives linked to this objective
      const linkedInitiatives = initiatives.filter(initiative => 
        initiative.objectives?.some((obj: any) => obj.id === objective.id)
      )
      
      return {
        objective,
        linkedInitiatives
      }
    })
  }, [objectives, initiatives, isLoading])
  
  // Debug logging for parameter processing
  useEffect(() => {
    if (urlParamsLoaded && !isLoading) {
      console.log('Objectives with initiatives processed:', {
        totalObjectives: objectives?.length || 0,
        totalInitiatives: initiatives?.length || 0,
        objectivesWithInitiatives: objectivesWithInitiatives.map(item => ({
          objective: item.objective.title,
          linkedInitiativesCount: item.linkedInitiatives.length,
          avgProgress: item.linkedInitiatives.length > 0 
            ? Math.round(item.linkedInitiatives.reduce((acc, init) => acc + (init.progress || 0), 0) / item.linkedInitiatives.length)
            : 0
        }))
      })
    }
  }, [urlParamsLoaded, isLoading, objectives, initiatives, objectivesWithInitiatives])
  
  const isCEOOrAdmin = profile?.role === 'CEO' || profile?.role === 'Admin'
  const isManager = profile?.role === 'Manager'
  const canCreateObjective = isCEOOrAdmin || isManager
  
  const handleSaveObjective = async (data: any, initiativeIds?: string[]) => {
    try {
      if (editingObjective) {
        await updateObjective(editingObjective.id, data, initiativeIds)
      } else {
        await createObjective(data, initiativeIds)
      }
      setShowCreateModal(false)
      setEditingObjective(null)
      window.location.reload()
    } catch (error) {
      logger.error('Error saving objective:', error)
      throw error
    }
  }

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={AlertTriangle}
          title={t('dashboard.objectives.unableToLoad')}
          description={t('dashboard.objectives.unableToLoadDescription')}
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
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.objectives.title')}</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{t('dashboard.objectives.title')}</h1>
              {shouldIncludeInitiatives && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {t('dashboard.objectives.withInitiatives')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              {t('dashboard.objectives.subtitleWithInitiatives')}
              {shouldIncludeInitiatives && ` ${t('dashboard.objectives.showingLinkedInitiatives')}`}
            </p>
          </div>
          {canCreateObjective && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.objectives.new')}
            </Button>
          )}
        </div>

        {/* Filter Section */}
        <div className="space-y-4">
          {/* Quick Search and Filter Toggle */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('dashboard.objectives.searchPlaceholder')}
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="pl-10 bg-card/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "border-border text-foreground hover:bg-accent/20",
                getActiveFilterCount() > 0 && "border-primary text-primary"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filters')}
              {getActiveFilterCount() > 0 && (
                <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                  {getActiveFilterCount()}
                </span>
              )}
            </Button>
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('common.clear')}
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <Card className="bg-card/50 backdrop-blur-sm border border-border">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DateRangeFilter
                    startDate={filters.startDate ? new Date(filters.startDate) : null}
                    endDate={filters.endDate ? new Date(filters.endDate) : null}
                    onChange={(startDate, endDate) => updateFilters({ 
                      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
                      endDate: endDate ? endDate.toISOString().split('T')[0] : null
                    })}
                  />
                  <AreaFilter
                    selected={filters.areas}
                    onChange={(areas) => updateFilters({ areas })}
                  />
                  <StatusFilter
                    selected={filters.statuses}
                    onChange={(statuses) => updateFilters({ statuses })}
                  />
                  <PriorityFilter
                    selected={filters.priorities}
                    onChange={(priorities) => updateFilters({ priorities })}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Cards - Now using processed initiative data */}
        {(() => {
          const filteredData = objectivesWithInitiatives ? applyFilters(objectivesWithInitiatives.map(item => item.objective)) : []
          const filteredObjectivesWithInit = objectivesWithInitiatives.filter(item => 
            filteredData.some(obj => obj.id === item.objective.id)
          )
          
          // Calculate total initiatives across all objectives
          const totalInitiatives = filteredObjectivesWithInit.reduce((acc, item) => 
            acc + item.linkedInitiatives.length, 0
          )
          
          // Calculate overall average progress
          const overallAvgProgress = filteredObjectivesWithInit.length > 0
            ? Math.round(
                filteredObjectivesWithInit.reduce((acc, item) => {
                  const initiatives = item.linkedInitiatives;
                  const avgProgress = initiatives.length > 0
                    ? initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / initiatives.length
                    : 0;
                  return acc + avgProgress;
                }, 0) / filteredObjectivesWithInit.length
              )
            : 0
            
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-sm border border-purple-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.objectives.totalObjectives')}</p>
                      <p className="text-2xl font-bold text-foreground">{filteredObjectivesWithInit.length}</p>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.objectives.totalInitiatives')}</p>
                      <p className="text-2xl font-bold text-foreground">{totalInitiatives}</p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.objectives.averageProgress')}</p>
                      <p className="text-2xl font-bold text-foreground">{overallAvgProgress}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {/* Objectives Grid */}
        {!isLoading && objectivesWithInitiatives && objectivesWithInitiatives.length > 0 ? (
          <>
            {/* Apply client-side filtering as fallback */}
            {(() => {
              const filteredData = applyFilters(objectivesWithInitiatives.map(item => item.objective))
              const filteredObjectivesWithInit = objectivesWithInitiatives.filter(item => 
                filteredData.some(obj => obj.id === item.objective.id)
              )
              
              return filteredObjectivesWithInit.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredObjectivesWithInit.map((item) => (
                    <ObjectiveCard 
                      key={item.objective.id} 
                      objective={item.objective}
                      linkedInitiatives={item.linkedInitiatives}
                      locale={locale}
                      onEdit={(obj) => {
                        setEditingObjective(obj)
                        setShowCreateModal(true)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title={t('dashboard.objectives.noMatchingFilters')}
                  description={t('dashboard.objectives.noMatchingFiltersDescription')}
                  action={{
                    label: t('dashboard.objectives.clearFilters'),
                    onClick: resetFilters
                  }}
                />
              )
            })()}
          </>
        ) : !isLoading ? (
          <EmptyState
            icon={Target}
            title={t('dashboard.objectives.noObjectives')}
            description={t('dashboard.objectives.noObjectivesDescription')}
            action={canCreateObjective ? {
              label: t('dashboard.objectives.createObjective'),
              onClick: () => setShowCreateModal(true)
            } : undefined}
          />
        ) : null}
      </div>
      
      {/* Objective Form Modal */}
      {canCreateObjective && (
        <ObjectiveFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingObjective(null)
          }}
          onSave={handleSaveObjective}
          objective={editingObjective}
          linkedInitiatives={
            editingObjective 
              ? objectivesWithInitiatives
                  .find(item => item.objective.id === editingObjective.id)
                  ?.linkedInitiatives.map(i => i.id) || []
              : []
          }
          locale={locale}
        />
      )}
    </ErrorBoundary>
  )
}