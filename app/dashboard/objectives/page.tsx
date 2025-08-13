"use client"

import React, { useState, useEffect } from "react"
import { logger } from "@/lib/logger"
import { useObjectives } from "@/hooks/useObjectives"
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

function ObjectiveCard({ objective, onEdit }: { objective: ObjectiveWithRelations; onEdit?: (objective: ObjectiveWithRelations) => void }) {
  // Calculate progress based on linked initiatives
  const totalInitiatives = objective.initiatives?.length || 0;
  const avgProgress = totalInitiatives > 0
    ? Math.round(
        objective.initiatives!.reduce((acc, init) => acc + (init.progress || 0), 0) / totalInitiatives
      )
    : 0;

  // Get date range display
  const dateRangeDisplay = objective.start_date && objective.end_date 
    ? `${new Date(objective.start_date).toLocaleDateString()} - ${new Date(objective.end_date).toLocaleDateString()}`
    : objective.start_date 
      ? `From ${new Date(objective.start_date).toLocaleDateString()}`
      : "No dates set";

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white">{objective.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{objective.area?.name || "No area"}</span>
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
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>View Initiatives</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {objective.description && (
          <p className="text-sm text-gray-400">{objective.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-300">
              {totalInitiatives} {totalInitiatives === 1 ? "Initiative" : "Initiatives"}
            </span>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Active
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Average Progress</span>
            <span className="text-white font-medium">{avgProgress}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>

        {/* Show linked initiatives preview */}
        {objective.initiatives && objective.initiatives.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Linked Initiatives</p>
            <div className="space-y-1">
              {objective.initiatives.slice(0, 3).map((init) => (
                <div key={init.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate">{init.title}</span>
                  <span className="text-gray-500">{init.progress}%</span>
                </div>
              ))}
              {objective.initiatives.length > 3 && (
                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  View all {objective.initiatives.length} initiatives
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
  const { profile } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingObjective, setEditingObjective] = useState<ObjectiveWithRelations | null>(null)
  const [locale, setLocale] = useState('es')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Initialize enhanced filters for objectives page
  const { filters, updateFilters, applyFilters, toQueryParams, resetFilters, getActiveFilterCount } = useEnhancedFilters({
    persistToUrl: true,
    persistToLocalStorage: true
  })
  
  // Convert filters to query params for API call
  const queryParams = toQueryParams()
  const queryString = new URLSearchParams({
    ...queryParams,
    include_initiatives: 'true'
  } as any).toString()
  
  // Fetch objectives with filters applied via API
  const { objectives, loading: isLoading, error, createObjective, updateObjective } = useObjectives({ 
    ...queryParams,
    include_initiatives: true 
  })
  
  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])
  
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
          title="Unable to load objectives"
          description="There was an error loading your objectives. Please try refreshing the page."
          action={{
            label: "Refresh",
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
          <h1 className="text-3xl font-bold text-white">Objectives</h1>
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
            <h1 className="text-3xl font-bold text-white">Objectives</h1>
            <p className="text-gray-400 mt-2">
              High-level goals that group your strategic initiatives
            </p>
          </div>
          {canCreateObjective && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {locale === 'es' ? 'Nuevo Objetivo' : 'New Objective'}
            </Button>
          )}
        </div>

        {/* Filter Section */}
        <div className="space-y-4">
          {/* Quick Search and Filter Toggle */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={locale === 'es' ? 'Buscar objetivos...' : 'Search objectives...'}
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="pl-10 bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "border-white/10 text-white hover:bg-white/10",
                getActiveFilterCount() > 0 && "border-primary text-primary"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              {locale === 'es' ? 'Filtros' : 'Filters'}
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
                className="text-gray-400 hover:text-white"
              >
                {locale === 'es' ? 'Limpiar' : 'Clear'}
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
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

        {/* Summary Cards - Now using filtered data */}
        {(() => {
          const filteredObjectives = objectives ? applyFilters(objectives) : []
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-sm border border-purple-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Objectives</p>
                      <p className="text-2xl font-bold text-white">{filteredObjectives.length}</p>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Initiatives</p>
                      <p className="text-2xl font-bold text-white">
                        {filteredObjectives.reduce((acc, obj) => acc + (obj.initiatives?.length || 0), 0)}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Avg Progress</p>
                      <p className="text-2xl font-bold text-white">
                        {filteredObjectives.length > 0
                          ? Math.round(
                              filteredObjectives.reduce((acc, obj) => {
                                const initiatives = obj.initiatives || [];
                                const avgProgress = initiatives.length > 0
                                  ? initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / initiatives.length
                                  : 0;
                                return acc + avgProgress;
                              }, 0) / filteredObjectives.length
                            )
                          : 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {/* Objectives Grid */}
        {objectives && objectives.length > 0 ? (
          <>
            {/* Apply client-side filtering as fallback */}
            {(() => {
              const filteredObjectives = applyFilters(objectives)
              return filteredObjectives.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredObjectives.map((objective) => (
                    <ObjectiveCard 
                      key={objective.id} 
                      objective={objective} 
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
                  title={locale === 'es' ? 'No se encontraron objetivos' : 'No objectives found'}
                  description={locale === 'es' 
                    ? 'Intenta ajustar los filtros para ver más resultados' 
                    : 'Try adjusting your filters to see more results'}
                  action={{
                    label: locale === 'es' ? 'Limpiar filtros' : 'Clear filters',
                    onClick: resetFilters
                  }}
                />
              )
            })()}
          </>
        ) : (
          <EmptyState
            icon={Target}
            title="No objectives yet"
            description="Create your first objective to start organizing your initiatives"
            action={canCreateObjective ? {
              label: locale === 'es' ? 'Crear Objetivo' : 'Create Objective',
              onClick: () => setShowCreateModal(true)
            } : undefined}
          />
        )}
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
          linkedInitiatives={editingObjective?.initiatives?.map(i => i.id) || []}
          locale={locale}
        />
      )}
    </ErrorBoundary>
  )
}