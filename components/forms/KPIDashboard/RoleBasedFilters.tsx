/**
 * Role-Based Filters Component
 * 
 * Dynamic filtering interface that adapts to user roles,
 * providing appropriate filter options based on permissions
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Filter, 
  X, 
  Users, 
  Target, 
  Calendar, 
  Zap,
  RotateCcw,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTenantIdFromLocalStorage } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// ===================================================================================
// TYPES
// ===================================================================================

interface KPIFilters {
  area_id?: string
  status?: string
  is_strategic?: boolean
  kpi_category?: string
  date_range?: {
    start: string
    end: string
  }
}

interface RoleBasedFiltersProps {
  userProfile: any
  filters: KPIFilters
  onFiltersChange: (filters: KPIFilters) => void
  loading: boolean
}

interface Area {
  id: string
  name: string
  description?: string
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================

export function RoleBasedFilters({ 
  userProfile, 
  filters, 
  onFiltersChange, 
  loading 
}: RoleBasedFiltersProps) {
  
  const [areas, setAreas] = useState<Area[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [localFilters, setLocalFilters] = useState<KPIFilters>(filters)

  const canViewAllAreas = ['CEO', 'Admin'].includes(userProfile?.role)
  const canFilterStrategic = ['CEO', 'Admin'].includes(userProfile?.role)

  // ===================================================================================
  // LOAD AREAS FOR FILTERING
  // ===================================================================================

  useEffect(() => {
    const loadAreas = async () => {
      if (!canViewAllAreas || !userProfile) return

      setLoadingAreas(true)
      try {
        const tenantId = getTenantIdFromLocalStorage()
        const headers: Record<string, string> = {}
        
        if (tenantId) {
          headers['x-tenant-id'] = tenantId
        }

        const response = await fetch('/api/areas', {
          headers,
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setAreas(data.areas || [])
        }
      } catch (error) {
        console.error('Error loading areas:', error)
        toast({
          title: 'Error',
          description: 'Failed to load areas for filtering',
          variant: 'destructive'
        })
      } finally {
        setLoadingAreas(false)
      }
    }

    loadAreas()
  }, [canViewAllAreas, userProfile])

  // ===================================================================================
  // FILTER MANAGEMENT
  // ===================================================================================

  const updateFilter = (key: keyof KPIFilters, value: any) => {
    const newFilters = { ...localFilters }
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key]
    } else {
      (newFilters as any)[key] = value
    }
    
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
    toast({
      title: 'Filters Applied',
      description: 'Dashboard updated with new filters'
    })
  }

  const clearFilters = () => {
    const clearedFilters: KPIFilters = {}
    
    // Preserve area filter for managers
    if (userProfile?.role === 'Manager' && userProfile.area) {
      clearedFilters.area_id = userProfile.area
    }
    
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    
    toast({
      title: 'Filters Cleared',
      description: 'All filters have been reset'
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.area_id) count++
    if (localFilters.status) count++
    if (localFilters.is_strategic !== undefined) count++
    if (localFilters.kpi_category) count++
    if (localFilters.date_range) count++
    return count
  }

  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters)

  // ===================================================================================
  // RENDER HELPERS
  // ===================================================================================

  const renderQuickFilters = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Quick Filters */}
      <div className="flex items-center gap-1">
        {['in_progress', 'completed', 'planning'].map(status => (
          <Button
            key={status}
            variant={localFilters.status === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('status', localFilters.status === status ? undefined : status)}
            className={cn(
              "h-7 text-xs",
              localFilters.status === status ? 'glassmorphic-button' : 'glassmorphic-button-ghost'
            )}
          >
            {status === 'in_progress' ? 'In Progress' :
             status === 'completed' ? 'Completed' : 'Planning'}
          </Button>
        ))}
      </div>

      {/* Strategic Filter (CEO/Admin only) */}
      {canFilterStrategic && (
        <Button
          variant={localFilters.is_strategic ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilter('is_strategic', localFilters.is_strategic ? undefined : true)}
          className={cn(
            "h-7 text-xs",
            localFilters.is_strategic ? 'glassmorphic-button' : 'glassmorphic-button-ghost'
          )}
        >
          <Zap className="w-3 h-3 mr-1" />
          Strategic Only
        </Button>
      )}
    </div>
  )

  // ===================================================================================
  // MAIN RENDER
  // ===================================================================================

  if (!userProfile) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphic-card p-6"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-white">Filters</h3>
            {getActiveFilterCount() > 0 && (
              <Badge className="glassmorphic-badge">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="glassmorphic-button-ghost text-xs"
            >
              {showAdvanced ? 'Basic' : 'Advanced'}
            </Button>
            
            {getActiveFilterCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={loading}
                className="glassmorphic-button-ghost text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-3">
          <Label className="text-sm text-white/90">Quick Filters</Label>
          {renderQuickFilters()}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Area Filter (CEO/Admin only) */}
                {canViewAllAreas && (
                  <div>
                    <Label className="text-sm text-white/90">Area</Label>
                    <Select 
                      value={localFilters.area_id || ''} 
                      onValueChange={(value) => updateFilter('area_id', value || undefined)}
                    >
                      <SelectTrigger className="glassmorphic-input mt-1">
                        <SelectValue placeholder={loadingAreas ? "Loading..." : "All areas"} />
                      </SelectTrigger>
                      <SelectContent className="glassmorphic-dropdown">
                        <SelectItem value="all">All Areas</SelectItem>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            <div className="flex flex-col">
                              <span>{area.name}</span>
                              {area.description && (
                                <span className="text-xs text-white/60">{area.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* KPI Category Filter */}
                <div>
                  <Label className="text-sm text-white/90">KPI Category</Label>
                  <Select 
                    value={localFilters.kpi_category || ''} 
                    onValueChange={(value) => updateFilter('kpi_category', value || undefined)}
                  >
                    <SelectTrigger className="glassmorphic-input mt-1">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="glassmorphic-dropdown">
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="learning">Learning & Growth</SelectItem>
                      <SelectItem value="sustainability">Sustainability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div>
                  <Label className="text-sm text-white/90">Status</Label>
                  <Select 
                    value={localFilters.status || ''} 
                    onValueChange={(value) => updateFilter('status', value || undefined)}
                  >
                    <SelectTrigger className="glassmorphic-input mt-1">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="glassmorphic-dropdown">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm text-white/90">Date Range</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white/70">Start Date</Label>
                    <Input
                      type="date"
                      value={localFilters.date_range?.start || ''}
                      onChange={(e) => updateFilter('date_range', {
                        ...localFilters.date_range,
                        start: e.target.value,
                        end: localFilters.date_range?.end || ''
                      })}
                      className="glassmorphic-input mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/70">End Date</Label>
                    <Input
                      type="date"
                      value={localFilters.date_range?.end || ''}
                      onChange={(e) => updateFilter('date_range', {
                        start: localFilters.date_range?.start || '',
                        end: e.target.value
                      })}
                      className="glassmorphic-input mt-1"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply/Reset Actions */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end gap-2 pt-4 border-t border-white/10"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalFilters(filters)}
              disabled={loading}
              className="glassmorphic-button-ghost"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={loading}
              className="glassmorphic-button"
            >
              <Search className="w-3 h-3 mr-1" />
              Apply Filters
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default RoleBasedFilters