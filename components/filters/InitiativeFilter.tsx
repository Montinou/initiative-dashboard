"use client"

import { useState, useEffect, useMemo } from "react"
import { Lightbulb, ChevronRight, ChevronDown, Search, X, Check, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client'

interface InitiativeFilterProps {
  selected: string[]
  onChange: (initiativeIds: string[]) => void
  areaId?: string // Optional area filter
  objectiveId?: string // Optional objective filter
}

interface Initiative {
  id: string
  title: string
  description: string | null
  progress: number
  status: string
  area: {
    id: string
    name: string
  }
  objectives?: {
    id: string
    title: string
  }[]
  activities_count?: number
  completed_activities?: number
}

export function InitiativeFilter({ selected, onChange, areaId, objectiveId }: InitiativeFilterProps) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

  // Fetch initiatives from database
  useEffect(() => {
    const fetchInitiatives = async () => {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('initiatives')
        .select(`
          id,
          title,
          description,
          progress,
          status,
          area:areas!inner(id, name),
          objectives:objective_initiatives(
            objective:objectives(id, title)
          ),
          activities(id, is_completed)
        `)
      
      // Filter by area if provided
      if (areaId) {
        query = query.eq('area_id', areaId)
      }
      
      // Filter by objective if provided
      if (objectiveId) {
        query = query.eq('objective_initiatives.objective_id', objectiveId)
      }
      
      const { data, error } = await query.order('title')
      
      if (!error && data) {
        // Transform and calculate activity counts
        const transformedData = data.map(init => {
          const activities = init.activities || []
          return {
            ...init,
            objectives: init.objectives?.map((oi: any) => oi.objective).filter(Boolean) || [],
            activities_count: activities.length,
            completed_activities: activities.filter((a: any) => a.is_completed).length
          }
        })
        setInitiatives(transformedData as Initiative[])
      }
      setLoading(false)
    }

    fetchInitiatives()
  }, [areaId, objectiveId])

  // Group initiatives by area
  const groupedInitiatives = useMemo(() => {
    const groups: Record<string, Initiative[]> = {}
    
    initiatives.forEach(initiative => {
      const areaName = initiative.area?.name || 'Sin área'
      if (!groups[areaName]) {
        groups[areaName] = []
      }
      groups[areaName].push(initiative)
    })
    
    return groups
  }, [initiatives])

  // Filter initiatives based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedInitiatives
    
    const query = searchQuery.toLowerCase()
    const filtered: Record<string, Initiative[]> = {}
    
    Object.entries(groupedInitiatives).forEach(([area, inits]) => {
      const filteredInits = inits.filter(init => 
        init.title.toLowerCase().includes(query) ||
        init.description?.toLowerCase().includes(query) ||
        init.area?.name.toLowerCase().includes(query) ||
        init.objectives?.some(obj => obj.title.toLowerCase().includes(query))
      )
      
      if (filteredInits.length > 0) {
        filtered[area] = filteredInits
      }
    })
    
    return filtered
  }, [groupedInitiatives, searchQuery])

  // Get selected initiative details
  const selectedInitiatives = useMemo(() => {
    return initiatives.filter(init => selected.includes(init.id))
  }, [initiatives, selected])

  const toggleInitiative = (initiativeId: string) => {
    if (selected.includes(initiativeId)) {
      onChange(selected.filter(id => id !== initiativeId))
    } else {
      onChange([...selected, initiativeId])
    }
  }

  const toggleArea = (areaName: string) => {
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(areaName)) {
      newExpanded.delete(areaName)
    } else {
      newExpanded.add(areaName)
    }
    setExpandedAreas(newExpanded)
  }

  const selectAllInArea = (areaName: string) => {
    const areaInitiatives = filteredGroups[areaName] || []
    const areaIds = areaInitiatives.map(init => init.id)
    const newSelection = new Set(selected)
    
    // Check if all are selected
    const allSelected = areaIds.every(id => newSelection.has(id))
    
    if (allSelected) {
      // Deselect all
      areaIds.forEach(id => newSelection.delete(id))
    } else {
      // Select all
      areaIds.forEach(id => newSelection.add(id))
    }
    
    onChange(Array.from(newSelection))
  }

  const clearSelection = () => {
    onChange([])
    setSearchQuery("")
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': 
        return { bg: 'bg-green-500/20', text: 'text-green-100', border: 'border-green-400/30' }
      case 'in_progress': 
        return { bg: 'bg-orange-500/20', text: 'text-orange-100', border: 'border-orange-400/30' }
      case 'planning': 
        return { bg: 'bg-blue-500/20', text: 'text-blue-100', border: 'border-blue-400/30' }
      case 'on_hold': 
        return { bg: 'bg-gray-500/20', text: 'text-gray-100', border: 'border-gray-400/30' }
      default: 
        return { bg: 'bg-gray-500/20', text: 'text-gray-100', border: 'border-gray-400/30' }
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    if (progress >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Iniciativas</span>
        {selected.length > 0 && (
          <Badge 
            variant="secondary"
            className="bg-cyan-500/20 text-cyan-100 border-cyan-400/30"
          >
            {selected.length}
          </Badge>
        )}
      </div>

      {/* Trigger Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between p-3 h-auto rounded-xl border transition-all duration-200",
          selected.length > 0
            ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/30"
            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
        )}
      >
        <span className="text-sm">
          {selected.length === 0 
            ? "Seleccionar iniciativas" 
            : `${selected.length} iniciativa${selected.length > 1 ? 's' : ''} seleccionada${selected.length > 1 ? 's' : ''}`
          }
        </span>
        <Lightbulb className="h-4 w-4" />
      </Button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar iniciativas..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-cyan-400/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10"
              >
                <X className="h-3 w-3 text-white/70" />
              </Button>
            )}
          </div>

          {/* Initiatives List (Grouped by Area) */}
          <ScrollArea className="h-[320px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                Cargando iniciativas...
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                No se encontraron iniciativas
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(filteredGroups).map(([areaName, areaInitiatives]) => {
                  const isExpanded = expandedAreas.has(areaName)
                  const areaIds = areaInitiatives.map(init => init.id)
                  const selectedInArea = areaIds.filter(id => selected.includes(id))
                  const allSelected = selectedInArea.length === areaIds.length && areaIds.length > 0
                  
                  return (
                    <div key={areaName} className="space-y-1">
                      {/* Area Header */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleArea(areaName)}
                          className="flex-1 justify-start p-2 h-auto hover:bg-white/5"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 mr-2 text-white/50" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 text-white/50" />
                          )}
                          <span className="text-sm font-medium text-white/80">{areaName}</span>
                          {selectedInArea.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-auto bg-cyan-500/20 text-cyan-100 border-cyan-400/30 text-xs"
                            >
                              {selectedInArea.length}/{areaIds.length}
                            </Badge>
                          )}
                        </Button>
                        
                        {/* Select All in Area */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectAllInArea(areaName)}
                          className="p-1 h-auto hover:bg-white/10"
                          title={allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border",
                            allSelected 
                              ? "bg-cyan-500/30 border-cyan-400/50" 
                              : "border-white/30"
                          )}>
                            {allSelected && <Check className="h-3 w-3 text-cyan-100" />}
                          </div>
                        </Button>
                      </div>
                      
                      {/* Area Initiatives */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {areaInitiatives.map((initiative) => {
                            const isSelected = selected.includes(initiative.id)
                            const statusStyle = getStatusStyle(initiative.status)
                            const progressColor = getProgressColor(initiative.progress)
                            
                            return (
                              <Button
                                key={initiative.id}
                                variant="ghost"
                                onClick={() => toggleInitiative(initiative.id)}
                                className={cn(
                                  "w-full justify-start p-2 h-auto rounded-lg transition-all duration-200",
                                  isSelected
                                    ? "bg-cyan-500/20 hover:bg-cyan-500/30"
                                    : "hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-start gap-3 w-full">
                                  {/* Checkbox */}
                                  <div className={cn(
                                    "mt-1 w-4 h-4 rounded border flex-shrink-0",
                                    isSelected 
                                      ? "bg-cyan-500/30 border-cyan-400/50" 
                                      : "border-white/30"
                                  )}>
                                    {isSelected && <Check className="h-3 w-3 text-cyan-100" />}
                                  </div>
                                  
                                  {/* Initiative Info */}
                                  <div className="flex-1 text-left space-y-1">
                                    <div className="text-sm font-medium text-white/90">
                                      {initiative.title}
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                          className={cn("h-full transition-all duration-300", progressColor)}
                                          style={{ width: `${initiative.progress}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-white/60 min-w-[35px]">
                                        {initiative.progress}%
                                      </span>
                                    </div>
                                    
                                    {/* Meta Info */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-xs px-1.5 py-0 border",
                                          statusStyle.bg,
                                          statusStyle.text,
                                          statusStyle.border
                                        )}
                                      >
                                        {initiative.status.replace('_', ' ')}
                                      </Badge>
                                      
                                      {initiative.activities_count !== undefined && (
                                        <span className="text-xs text-white/50">
                                          {initiative.completed_activities}/{initiative.activities_count} actividades
                                        </span>
                                      )}
                                      
                                      {initiative.objectives && initiative.objectives.length > 0 && (
                                        <span className="text-xs text-white/40">
                                          • {initiative.objectives.length} objetivo{initiative.objectives.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected Initiatives Display */}
          {selectedInitiatives.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Iniciativas seleccionadas:</div>
              <div className="flex flex-wrap gap-2">
                {selectedInitiatives.map((initiative) => (
                  <Badge
                    key={initiative.id}
                    variant="secondary"
                    className="bg-cyan-500/20 text-cyan-100 border-cyan-400/30 pr-1"
                  >
                    <span className="text-xs">{initiative.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleInitiative(initiative.id)
                      }}
                      className="ml-1 h-4 w-4 p-0 hover:bg-cyan-500/30"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              {/* Clear Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
              >
                Limpiar selección
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}