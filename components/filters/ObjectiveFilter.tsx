"use client"

import { useState, useEffect, useMemo } from "react"
import { Target, ChevronRight, ChevronDown, Search, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createClient } from '@/utils/supabase/client'

interface ObjectiveFilterProps {
  selected: string[]
  onChange: (objectiveIds: string[]) => void
  areaId?: string // Optional area filter
}

interface Objective {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  progress: number
  area?: {
    id: string
    name: string
  }
  initiatives?: {
    id: string
    title: string
  }[]
}

export function ObjectiveFilter({ selected, onChange, areaId }: ObjectiveFilterProps) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

  // Fetch objectives from database
  useEffect(() => {
    const fetchObjectives = async () => {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('objectives')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          progress,
          area:areas(id, name),
          initiatives:objective_initiatives(
            initiative:initiatives(id, title)
          )
        `)
      
      // Filter by area if provided
      if (areaId) {
        query = query.eq('area_id', areaId)
      }
      
      const { data, error } = await query.order('title')
      
      if (!error && data) {
        // Transform the nested initiatives structure
        const transformedData = data.map(obj => ({
          ...obj,
          initiatives: obj.initiatives?.map((oi: any) => oi.initiative).filter(Boolean) || []
        }))
        setObjectives(transformedData as Objective[])
      }
      setLoading(false)
    }

    fetchObjectives()
  }, [areaId])

  // Group objectives by area
  const groupedObjectives = useMemo(() => {
    const groups: Record<string, Objective[]> = {}
    
    objectives.forEach(objective => {
      const areaName = objective.area?.name || 'Sin área'
      if (!groups[areaName]) {
        groups[areaName] = []
      }
      groups[areaName].push(objective)
    })
    
    return groups
  }, [objectives])

  // Filter objectives based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedObjectives
    
    const query = searchQuery.toLowerCase()
    const filtered: Record<string, Objective[]> = {}
    
    Object.entries(groupedObjectives).forEach(([area, objs]) => {
      const filteredObjs = objs.filter(obj => 
        obj.title.toLowerCase().includes(query) ||
        obj.description?.toLowerCase().includes(query) ||
        obj.area?.name.toLowerCase().includes(query) ||
        obj.initiatives?.some(init => init.title.toLowerCase().includes(query))
      )
      
      if (filteredObjs.length > 0) {
        filtered[area] = filteredObjs
      }
    })
    
    return filtered
  }, [groupedObjectives, searchQuery])

  // Get selected objective details
  const selectedObjectives = useMemo(() => {
    return objectives.filter(obj => selected.includes(obj.id))
  }, [objectives, selected])

  const toggleObjective = (objectiveId: string) => {
    if (selected.includes(objectiveId)) {
      onChange(selected.filter(id => id !== objectiveId))
    } else {
      onChange([...selected, objectiveId])
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
    const areaObjectives = filteredGroups[areaName] || []
    const areaIds = areaObjectives.map(obj => obj.id)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'in_progress': return 'text-orange-400'
      case 'planning': return 'text-blue-400'
      case 'overdue': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500/20', text: 'text-red-100', border: 'border-red-400/30' }
      case 'medium': return { bg: 'bg-yellow-500/20', text: 'text-yellow-100', border: 'border-yellow-400/30' }
      case 'low': return { bg: 'bg-blue-500/20', text: 'text-blue-100', border: 'border-blue-400/30' }
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-100', border: 'border-gray-400/30' }
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Objetivos</span>
        {selected.length > 0 && (
          <Badge 
            variant="secondary"
            className="bg-indigo-500/20 text-indigo-100 border-indigo-400/30"
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
            ? "bg-indigo-500/20 text-indigo-100 border-indigo-400/30"
            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
        )}
      >
        <span className="text-sm">
          {selected.length === 0 
            ? "Seleccionar objetivos" 
            : `${selected.length} objetivo${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
          }
        </span>
        <Target className="h-4 w-4" />
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
              placeholder="Buscar objetivos..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-indigo-400/50"
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

          {/* Objectives List (Grouped by Area) */}
          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                Cargando objetivos...
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="flex items-center justify-center h-20 text-white/50 text-sm">
                No se encontraron objetivos
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(filteredGroups).map(([areaName, areaObjectives]) => {
                  const isExpanded = expandedAreas.has(areaName)
                  const areaIds = areaObjectives.map(obj => obj.id)
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
                              className="ml-auto bg-indigo-500/20 text-indigo-100 border-indigo-400/30 text-xs"
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
                          title={allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border",
                            allSelected 
                              ? "bg-indigo-500/30 border-indigo-400/50" 
                              : "border-white/30"
                          )}>
                            {allSelected && <Check className="h-3 w-3 text-indigo-100" />}
                          </div>
                        </Button>
                      </div>
                      
                      {/* Area Objectives */}
                      {isExpanded && (
                        <div className="ml-6 space-y-1">
                          {areaObjectives.map((objective) => {
                            const isSelected = selected.includes(objective.id)
                            const priorityStyle = getPriorityBadge(objective.priority)
                            
                            return (
                              <Button
                                key={objective.id}
                                variant="ghost"
                                onClick={() => toggleObjective(objective.id)}
                                className={cn(
                                  "w-full justify-start p-2 h-auto rounded-lg transition-all duration-200",
                                  isSelected
                                    ? "bg-indigo-500/20 hover:bg-indigo-500/30"
                                    : "hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-start gap-3 w-full">
                                  {/* Checkbox */}
                                  <div className={cn(
                                    "mt-1 w-4 h-4 rounded border flex-shrink-0",
                                    isSelected 
                                      ? "bg-indigo-500/30 border-indigo-400/50" 
                                      : "border-white/30"
                                  )}>
                                    {isSelected && <Check className="h-3 w-3 text-indigo-100" />}
                                  </div>
                                  
                                  {/* Objective Info */}
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white/90">
                                      {objective.title}
                                    </div>
                                    
                                    {/* Meta Info */}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge
                                        variant="secondary"
                                        className={cn(
                                          "text-xs px-1.5 py-0 border",
                                          priorityStyle.bg,
                                          priorityStyle.text,
                                          priorityStyle.border
                                        )}
                                      >
                                        {objective.priority}
                                      </Badge>
                                      
                                      <span className={cn("text-xs", getStatusColor(objective.status))}>
                                        {objective.status.replace('_', ' ')}
                                      </span>
                                      
                                      <span className="text-xs text-white/50">
                                        {objective.progress}% completado
                                      </span>
                                      
                                      {objective.initiatives && objective.initiatives.length > 0 && (
                                        <span className="text-xs text-white/40">
                                          • {objective.initiatives.length} iniciativa{objective.initiatives.length > 1 ? 's' : ''}
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

          {/* Selected Objectives Display */}
          {selectedObjectives.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Objetivos seleccionados:</div>
              <div className="flex flex-wrap gap-2">
                {selectedObjectives.map((objective) => (
                  <Badge
                    key={objective.id}
                    variant="secondary"
                    className="bg-indigo-500/20 text-indigo-100 border-indigo-400/30 pr-1"
                  >
                    <span className="text-xs">{objective.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleObjective(objective.id)
                      }}
                      className="ml-1 h-4 w-4 p-0 hover:bg-indigo-500/30"
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