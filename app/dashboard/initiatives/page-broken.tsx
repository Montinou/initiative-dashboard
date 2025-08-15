"use client"

import React, { useState, useEffect, useMemo } from "react"
import { logger } from "@/lib/logger"
import { useInitiatives } from "@/hooks/useInitiatives"
import { InitiativeFormModal } from "@/components/modals"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
  MoreHorizontal,
  Plus,
  Edit
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
// import { SimpleFilterBar } from "@/components/filters/SimpleFilterBar"
// import { useEnhancedFilters } from "@/hooks/useFilters"
import { useTranslations } from 'next-intl'

interface Initiative {
  id: string
  name: string
  progress: number
  status: "planning" | "in_progress" | "completed" | "on_hold"
  owner: string
  dueDate: string
  area: string
  priority: "high" | "medium" | "low" | "High" | "Medium" | "Low"
  description?: string
}

function InitiativeCard({ initiative, onEdit }: { initiative: Initiative; onEdit?: (initiative: Initiative) => void }) {
  // Provide safe fallbacks for all initiative properties
  const safeInitiative = {
    name: initiative?.name || 'Untitled Initiative',
    status: initiative?.status || 'planning',
    priority: initiative?.priority || 'medium',
    progress: initiative?.progress || 0,
    area: initiative?.area || 'Unknown Area',
    owner: initiative?.owner || 'Unassigned',
    dueDate: initiative?.dueDate || 'No date set',
    description: initiative?.description || ''
  }

  // Map database status values to display status
  const statusMapping = {
    'planning': 'Active',
    'in_progress': 'Active', 
    'completed': 'Completed',
    'on_hold': 'On Hold'
  }

  const statusConfig = {
    Active: { color: "text-blue-500", icon: Clock },
    Completed: { color: "text-green-500", icon: CheckCircle2 },
    "At Risk": { color: "text-red-500", icon: AlertTriangle },
    "On Hold": { color: "text-gray-500", icon: Clock },
  }

  const priorityConfig = {
    High: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Low: "bg-green-500/10 text-green-500 border-green-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
  }

  // Map database status to display status, with fallback
  const displayStatus = statusMapping[safeInitiative.status as keyof typeof statusMapping] || 'Active'
  const StatusIcon = statusConfig[displayStatus]?.icon || Clock

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white">{safeInitiative.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{safeInitiative.area}</span>
              <span>•</span>
              <span>{safeInitiative.owner}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(initiative)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {safeInitiative.description && (
          <p className="text-sm text-gray-400">{safeInitiative.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", statusConfig[displayStatus]?.color || "text-blue-500")} />
            <span className="text-sm text-gray-300">{displayStatus}</span>
          </div>
          <Badge variant="outline" className={priorityConfig[safeInitiative.priority] || priorityConfig.medium}>
            {safeInitiative.priority} Priority
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{safeInitiative.progress}%</span>
          </div>
          <Progress value={safeInitiative.progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>Due {safeInitiative.dueDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InitiativesPage() {
  const t = useTranslations('dashboard')
  const { initiatives, loading: isLoading, error, createInitiative, updateInitiative } = useInitiatives()
  const { profile } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null)
  
  const isCEOOrAdmin = profile?.role === 'CEO' || profile?.role === 'Admin'
  const isManager = profile?.role === 'Manager'
  const canCreateInitiative = isCEOOrAdmin || isManager
  
  const handleSaveInitiative = async (data: any, objectiveIds?: string[], activities?: any[]) => {
    try {
      if (editingInitiative) {
        await updateInitiative(editingInitiative.id, data)
      } else {
        const response = await fetch('/api/initiatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...data,
            objective_ids: objectiveIds,
            activities
          })
        })
        
        if (!response.ok) throw new Error('Failed to create initiative')
      }
      
      setShowCreateModal(false)
      setEditingInitiative(null)
      window.location.reload()
    } catch (error) {
      logger.error('Error saving initiative:', error)
      throw error
    }
  }

  // Don't show error if authentication is still loading
  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={AlertTriangle}
          title={t('initiatives.unableToLoad')}
          description={t('initiatives.unableToLoadDescription')}
          action={{
            label: t('common.refresh'),
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  // Show loading if either initiatives or auth are loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">{t('initiatives.title')}</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  // Apply filters to initiatives - simplified to avoid hook issues
  const filteredInitiatives = useMemo(() => {
    if (!initiatives || initiatives.length === 0) {
      console.log('InitiativesPage: No initiatives data available')
      return []
    }
    
    console.log('InitiativesPage: Raw initiatives count:', initiatives.length)
    
    // For now, just return all initiatives without filtering to fix the React error
    // We'll add filtering back once the page is stable
    return initiatives
  }, [initiatives])
  
  const activeInitiatives = filteredInitiatives?.filter((i: any) => 
    i.status === "in_progress" || i.status === "planning" || i.status === "Active"
  ) || []
  const completedInitiatives = filteredInitiatives?.filter((i: any) => 
    i.status === "completed" || i.status === "Completed"
  ) || []
  const atRiskInitiatives = filteredInitiatives?.filter((i: any) => 
    i.status === "on_hold" || i.status === "At Risk"
  ) || []

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{t('initiatives.title')}</h1>
            <p className="text-gray-400 mt-2">
              {t('initiatives.subtitle')}
            </p>
          </div>
          {canCreateInitiative && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('initiatives.new')}
            </Button>
          )}
        </div>
        
        {/* Filter Bar - temporarily disabled to fix React error */}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('common.active')}</p>
                  <p className="text-2xl font-bold text-white">{activeInitiatives.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('status.completed')}</p>
                  <p className="text-2xl font-bold text-white">{completedInitiatives.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-600/30 to-red-800/20 backdrop-blur-sm border border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('common.atRisk')}</p>
                  <p className="text-2xl font-bold text-white">{atRiskInitiatives.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Initiatives Grid */}
        {filteredInitiatives && filteredInitiatives.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInitiatives.map((initiative: any) => (
              <InitiativeCard 
                key={initiative.id} 
                initiative={{
                  ...initiative,
                  name: initiative.name || initiative.title // Handle both name and title
                }} 
                onEdit={(init) => {
                  setEditingInitiative(init)
                  setShowCreateModal(true)
                }}
              />
            ))}
          </div>
        ) : initiatives && initiatives.length > 0 ? (
          <EmptyState
            icon={Zap}
            title={t('initiatives.noMatchingFilters')}
            description={t('initiatives.noMatchingFiltersDescription')}
            action={{
              label: t('common.clearFilters'),
              onClick: () => window.location.reload()
            }}
          />
        ) : (
          <EmptyState
            icon={Zap}
            title={t('initiatives.noInitiatives')}
            description={t('initiatives.noInitiativesDescription')}
            action={canCreateInitiative ? {
              label: t('initiatives.new'),
              onClick: () => setShowCreateModal(true)
            } : undefined}
          />
        )}
      </div>
      
      {/* Initiative Form Modal */}
      {canCreateInitiative && (
        <InitiativeFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingInitiative(null)
          }}
          onSave={handleSaveInitiative}
          initiative={editingInitiative}
        />
      )}
    </ErrorBoundary>
  )
}