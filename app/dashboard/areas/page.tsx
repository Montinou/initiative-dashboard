"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useAreas } from "@/hooks/useAreas"
import { AreaFormModal } from "@/components/modals"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Target,
  TrendingUp,
  BarChart3,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Plus,
  Edit,
  Search,
  Filter
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { CardLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEnhancedFilters } from "@/hooks/useFilters"
import { useTranslations } from 'next-intl'

interface Objective {
  id: string
  name: string
  progress: number
  target: number
  unit: string
}

interface Area {
  id: string
  name: string
  description: string
  lead: string
  objectives: Objective[]
  overallProgress: number
  initiativeCount: number
  status: "On Track" | "At Risk" | "Behind"
}

function AreaCard({ area, onEdit }: { area: Area; onEdit?: (area: Area) => void }) {
  const statusConfig = {
    "On Track": "text-green-500 bg-green-500/10 border-green-500/20",
    "At Risk": "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Behind: "text-red-500 bg-red-500/10 border-red-500/20",
  }

  // Ensure area and objectives are properly defined
  if (!area) {
    logger.error('AreaCard: area is undefined')
    return null
  }

  // Ensure objectives is always an array
  const objectives = Array.isArray(area.objectives) ? area.objectives : []
  const topObjectives = objectives.slice(0, 3)

  return (
    <Card className="bg-card/50 backdrop-blur-sm border border-border hover:border-accent transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl text-foreground">{area.name || 'Unnamed Area'}</CardTitle>
            <p className="text-sm text-muted-foreground">Led by {area.lead || 'Unassigned'}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(area)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Area
              </DropdownMenuItem>
              <DropdownMenuItem>Manage Objectives</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground/80">{area.description || 'No description available'}</p>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className={statusConfig[area.status || "Behind"]}>
            {area.status || "Behind"}
          </Badge>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{objectives.length} Objectives</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{area.initiativeCount || 0} Initiatives</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-foreground font-medium">{area.overallProgress || 0}%</span>
          </div>
          <Progress value={area.overallProgress || 0} className="h-2" />
        </div>

        {topObjectives.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Key Objectives</p>
            <div className="space-y-2">
              {topObjectives.map((objective) => (
                <div key={objective.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate flex-1 mr-2">
                    {objective.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">
                      {objective.progress}{objective.unit}
                    </span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">
                      {objective.target}{objective.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AreasPage() {
  const { profile, loading: authLoading } = useAuth()
  const t = useTranslations()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingArea, setEditingArea] = useState<any | null>(null)
  const [locale, setLocale] = useState('es') // Add locale state
  
  // Initialize enhanced filters for areas page
  const { filters, updateFilters, applyFilters, resetFilters, getActiveFilterCount } = useEnhancedFilters({
    persistToUrl: true,
    persistToLocalStorage: true
  })
  
  // Fetch areas with stats
  const { areas: rawAreas, loading, error, createArea, updateArea } = useAreas({ includeStats: true })
  
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
  
  const handleSaveArea = async (data: any) => {
    try {
      if (editingArea) {
        await updateArea(editingArea.id, data)
      } else {
        await createArea(data)
      }
      setShowCreateModal(false)
      setEditingArea(null)
      window.location.reload()
    } catch (error) {
      logger.error('Error saving area', error as Error, { context: 'handleSaveArea' })
      throw error
    }
  }
  
  // Log areas data for debugging if needed
  React.useEffect(() => {
    if (rawAreas) {
      logger.debug(`Areas loaded: ${rawAreas.length} areas`, { service: 'AreasPage' })
    }
  }, [rawAreas])
  
  // Transform API data to match component expectations
  const areas: Area[] = rawAreas?.map((rawArea: any) => {
    // Ensure we have a valid rawArea object
    if (!rawArea || typeof rawArea !== 'object') {
      logger.warn('Invalid rawArea data', { rawArea })
      return null
    }
    
    // Transform objectives data from stats
    const objectives = rawArea.stats?.objectives?.map((obj: any, index: number) => ({
      id: `${rawArea.id}-obj-${index}`,
      name: obj.name,
      progress: obj.progress || 0,
      target: 100,
      unit: '%'
    })) || []
    
    const transformedArea = {
      id: rawArea.id || `area-${Math.random()}`,
      name: rawArea.name || 'Unnamed Area',
      description: rawArea.description || '',
      lead: rawArea.user_profiles?.full_name || rawArea.manager?.full_name || 'Unassigned',
      objectives: objectives,
      overallProgress: rawArea.stats?.averageProgress || 0,
      initiativeCount: rawArea.stats?.total || 0,
      status: getAreaStatus(rawArea.stats)
    }
    
    // Log transformation in development mode only
    logger.debug(`Area transformation: ${rawArea.name}`, {
      initiativeCount: transformedArea.initiativeCount,
      overallProgress: transformedArea.overallProgress
    })
    
    return transformedArea
  }).filter(Boolean) as Area[] || []
  
  // Helper function to determine area status
  function getAreaStatus(stats: any): "On Track" | "At Risk" | "Behind" {
    if (!stats || stats.total === 0) return "Behind"
    
    // Use averageProgress from API instead of calculating from status counts
    const avgProgress = stats.averageProgress || 0
    
    if (avgProgress >= 70) return "On Track"
    if (avgProgress >= 40) return "At Risk"
    return "Behind"
  }

  // Don't show error if authentication is still loading
  if (error && !authLoading) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Users}
          title="Unable to load areas"
          description="There was an error loading your business areas. Please try refreshing the page."
          action={{
            label: "Refresh",
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  // Show loading if either areas are loading or authentication is loading
  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Business Areas</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <CardLoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Apply client-side filtering to areas
  const filteredAreas = useMemo(() => {
    if (!areas) return []
    
    // Map areas to have properties that filters expect
    const mappedAreas = areas.map((area: Area) => ({
      ...area,
      title: area.name, // Map name to title for search
      description: area.description,
      progress: area.overallProgress,
      status: area.status === "On Track" ? "in_progress" : 
              area.status === "At Risk" ? "planning" : 
              "on_hold" // Map area status to database status
    }))
    
    // Only apply search filter for areas page
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.toLowerCase().trim()
      return mappedAreas.filter(area => {
        const searchableFields = [
          area.name,
          area.description,
          area.lead
        ].filter(Boolean)
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        )
      })
    }
    
    return mappedAreas
  }, [areas, filters.searchQuery])
  
  const totalInitiatives = filteredAreas?.reduce((acc: number, area: Area) => acc + (area.initiativeCount || 0), 0) || 0
  const averageProgress = filteredAreas?.length 
    ? Math.round(filteredAreas.reduce((acc: number, area: Area) => acc + (area.overallProgress || 0), 0) / filteredAreas.length)
    : 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Business Areas</h1>
            <p className="text-muted-foreground mt-2">
              Monitor performance across your organization's key areas
            </p>
          </div>
          {isCEOOrAdmin && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {locale === 'es' ? 'Nueva Área' : 'New Area'}
            </Button>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={locale === 'es' ? 'Buscar áreas...' : 'Search areas...'}
              value={filters.searchQuery || ''}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="pl-10 bg-card/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              {locale === 'es' ? 'Limpiar filtros' : 'Clear filters'}
              <span className="ml-2 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                {getActiveFilterCount()}
              </span>
            </Button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Areas</p>
                  <p className="text-2xl font-bold text-foreground">{filteredAreas?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Initiatives</p>
                  <p className="text-2xl font-bold text-foreground">{totalInitiatives}</p>
                </div>
                <Target className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Progress</p>
                  <p className="text-2xl font-bold text-foreground">{averageProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Areas at Risk</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredAreas?.filter((a: Area) => a.status === "At Risk").length || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Areas Grid - Now using filtered data */}
        {areas && areas.length > 0 ? (
          filteredAreas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAreas.map((area: Area) => {
                // Additional safety check before rendering
                if (!area || !area.id) {
                  logger.warn('Skipping invalid area', { area })
                  return null
                }
                return <AreaCard key={area.id} area={area} onEdit={(area) => {
                  setEditingArea(area)
                  setShowCreateModal(true)
                }} />
              }).filter(Boolean)}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title={locale === 'es' ? 'No se encontraron áreas' : 'No areas found'}
              description={locale === 'es' 
                ? 'Intenta ajustar tu búsqueda para ver más resultados' 
                : 'Try adjusting your search to see more results'}
              action={{
                label: locale === 'es' ? 'Limpiar búsqueda' : 'Clear search',
                onClick: resetFilters
              }}
            />
          )
        ) : (
          <EmptyState
            icon={Users}
            title="No business areas defined"
            description="Create your first business area to start organizing objectives"
            action={isCEOOrAdmin ? {
              label: locale === 'es' ? 'Crear Área' : 'Create Area',
              onClick: () => setShowCreateModal(true)
            } : undefined}
          />
        )}
      </div>
      
      {/* Area Form Modal */}
      {isCEOOrAdmin && (
        <AreaFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingArea(null)
          }}
          onSave={handleSaveArea}
          area={editingArea}
          locale={locale}
        />
      )}
    </ErrorBoundary>
  )
}