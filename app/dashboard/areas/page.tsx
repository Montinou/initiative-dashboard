"use client"

import React, { useState, useEffect } from "react"
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
  const t = useTranslations('dashboard')
  
  const statusConfig = {
    "On Track": "text-green-500 bg-green-500/10 border-green-500/20",
    "At Risk": "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Behind: "text-red-500 bg-red-500/10 border-red-500/20",
  }
  
  const statusTranslations = {
    "On Track": t('areas.status.onTrack'),
    "At Risk": t('areas.status.atRisk'),
    Behind: t('areas.status.behind'),
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
            <CardTitle className="text-xl text-foreground">{area.name || t('areas.unnamedArea')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('areas.ledBy')} {area.lead || t('areas.unassigned')}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{t('areas.actions.viewDetails')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(area)}>
                <Edit className="h-4 w-4 mr-2" />
                {t('areas.actions.editArea')}
              </DropdownMenuItem>
              <DropdownMenuItem>{t('areas.actions.manageObjectives')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground/80">{area.description || t('areas.noDescriptionAvailable')}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {area.initiativeCount} {t('areas.initiatives')}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs", statusConfig[area.status])}
            >
              {statusTranslations[area.status] || area.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('areas.progress')}</span>
            <span className="text-lg font-semibold text-foreground">
              {Math.round(area.overallProgress)}%
            </span>
          </div>
        </div>
        
        <Progress 
          value={area.overallProgress} 
          className="h-2 bg-secondary"
        />
        
        {topObjectives.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-foreground">{t('areas.topObjectives')}</h4>
            {topObjectives.map((objective) => (
              <div key={objective.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/80">{objective.name}</span>
                  <span className="text-sm font-medium text-foreground">
                    {objective.progress}/{objective.target} {objective.unit}
                  </span>
                </div>
                <Progress 
                  value={(objective.progress / objective.target) * 100} 
                  className="h-1.5 bg-secondary"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AreasPage() {
  const { profile, loading: authLoading, user } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const t = useTranslations('dashboard')
  
  // Don't render until auth is initialized
  if (authLoading) {
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

  // Redirect if not authenticated
  if (!user || !profile) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }
  
  const isCEOOrAdmin = profile?.role === 'CEO' || profile?.role === 'Admin'
  const isManager = profile?.role === 'Manager'
  const canCreateArea = isCEOOrAdmin

  // Fetch areas data - Only when auth is complete
  useEffect(() => {
    const fetchAreas = async () => {
      // Only fetch if auth is complete
      if (authLoading || !user || !profile) {
        return
      }
      
      try {
        setLoading(true)
        const response = await fetch('/api/areas?includeStats=true', {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error(t('areas.errors.fetchFailed'))
        }
        
        const data = await response.json()
        
        // Transform API data to match component expectations
        const transformedAreas = (data.areas || []).map((rawArea: any) => {
          // Transform objectives data from stats
          const objectives = rawArea.stats?.objectives?.map((obj: any, index: number) => ({
            id: `${rawArea.id}-obj-${index}`,
            name: obj.name,
            progress: obj.progress || 0,
            target: 100,
            unit: '%'
          })) || []
          
          return {
            id: rawArea.id || `area-${Math.random()}`,
            name: rawArea.name || 'Unnamed Area',
            description: rawArea.description || '',
            lead: rawArea.manager?.full_name || 'Unassigned',
            objectives: objectives,
            overallProgress: rawArea.stats?.averageProgress || rawArea.stats?.average_progress || 0,
            initiativeCount: rawArea.stats?.total || rawArea.stats?.total_initiatives || 0,
            status: getAreaStatus(rawArea.stats)
          }
        })
        
        setAreas(transformedAreas)
        setError(null)
      } catch (err) {
        console.error('Error fetching areas:', err)
        setError(t('areas.errors.fetchFailed'))
      } finally {
        setLoading(false)
      }
    }

    fetchAreas()
  }, [authLoading, user, profile])

  // Helper function to determine area status
  function getAreaStatus(stats: any): "On Track" | "At Risk" | "Behind" {
    if (!stats || (stats.total === 0 && stats.total_initiatives === 0)) return "Behind"
    
    const avgProgress = stats.averageProgress || stats.average_progress || 0
    
    if (avgProgress >= 70) return "On Track"
    if (avgProgress >= 40) return "At Risk"
    return "Behind"
  }

  const handleEditArea = (area: Area) => {
    setEditingArea(area)
    setShowCreateModal(true)
  }

  const handleSaveArea = async (data: any) => {
    try {
      const method = editingArea ? 'PATCH' : 'POST'
      const url = editingArea ? `/api/areas/${editingArea.id}` : '/api/areas'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(t('areas.errors.saveFailed'))
      }
      
      setShowCreateModal(false)
      setEditingArea(null)
      window.location.reload()
    } catch (error) {
      logger.error('Error saving area', error as Error, { context: 'handleSaveArea' })
      throw error
    }
  }

  // Filter areas based on search query
  const filteredAreas = areas.filter(area => 
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.lead.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Summary statistics
  const totalAreas = filteredAreas.length
  const totalInitiatives = filteredAreas.reduce((sum, area) => sum + area.initiativeCount, 0)
  const avgProgress = totalAreas > 0
    ? Math.round(filteredAreas.reduce((sum, area) => sum + area.overallProgress, 0) / totalAreas)
    : 0
  const areasAtRisk = filteredAreas.filter(area => area.status === "At Risk" || area.status === "Behind").length

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={Users}
          title={t('areas.unableToLoadTitle')}
          description={t('areas.unableToLoadDescription')}
          action={{
            label: t('areas.actions.refresh'),
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (loading) {
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

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('areas.businessAreas')}</h1>
            <p className="text-muted-foreground mt-2">
              Monitor performance across your organization's key areas
            </p>
          </div>
          {canCreateArea && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('areas.new')}
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('areas.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/60 backdrop-blur-sm"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 backdrop-blur-sm border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('areas.totalAreas')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalAreas}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 backdrop-blur-sm border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('areas.totalInitiatives')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalInitiatives}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/10 backdrop-blur-sm border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('areas.averageProgress')}</p>
                  <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/10 backdrop-blur-sm border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('areas.areasAtRisk')}</p>
                  <p className="text-2xl font-bold text-foreground">{areasAtRisk}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Areas Grid */}
        {filteredAreas.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('areas.noAreasDefinedTitle')}
            description={t('areas.noAreasDefinedDescription')}
            action={canCreateArea ? {
              label: t('areas.actions.createArea'),
              onClick: () => setShowCreateModal(true)
            } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAreas.map((area) => (
              <AreaCard 
                key={area.id} 
                area={area} 
                onEdit={canCreateArea ? handleEditArea : undefined}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {canCreateArea && (
          <AreaFormModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              setEditingArea(null)
            }}
            onSave={handleSaveArea}
            area={editingArea}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}