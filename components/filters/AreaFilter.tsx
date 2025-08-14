"use client"

import { useState, useEffect } from "react"
import { Users, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { useTenantId } from "@/lib/auth-context"
import { FilterErrorBoundary } from "./FilterErrorBoundary"

interface Area {
  id: string
  name: string
  description?: string
}

interface AreaFilterProps {
  selected: string[]
  onChange: (areas: string[]) => void
}

function AreaFilterComponent({ selected, onChange }: AreaFilterProps) {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()
  const tenantId = useTenantId()

  useEffect(() => {
    const fetchAreas = async () => {
      if (!tenantId) return
      
      try {
        const { data, error } = await supabase
          .from('areas')
          .select('id, name, description')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setAreas(data || [])
      } catch (error) {
        console.error('Error fetching areas:', error)
        setAreas([])
      } finally {
        setLoading(false)
      }
    }

    fetchAreas()
  }, [supabase, tenantId])

  const toggleArea = (areaId: string) => {
    if (selected.includes(areaId)) {
      onChange(selected.filter(id => id !== areaId))
    } else {
      onChange([...selected, areaId])
    }
  }

  const getSelectedAreasText = () => {
    if (selected.length === 0) return "Todas las áreas"
    if (selected.length === 1) {
      const area = areas.find(a => a.id === selected[0])
      return area?.name || "Área seleccionada"
    }
    return `${selected.length} áreas seleccionadas`
  }

  const getAreaName = (areaId: string) => {
    return areas.find(a => a.id === areaId)?.name || areaId
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Áreas</span>
        </div>
        <div className="bg-muted border border-border rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-muted-foreground/20 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Áreas</span>
      </div>
      
      <div className="relative">
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full justify-between bg-card border border-border rounded-lg p-3 h-auto hover:bg-accent hover:text-accent-foreground",
            isOpen && "bg-accent"
          )}
        >
          <span className="text-sm truncate">
            {getSelectedAreasText()}
          </span>
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {areas.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No hay áreas disponibles
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {areas.map((area) => {
                  const isSelected = selected.includes(area.id)
                  return (
                    <Button
                      key={area.id}
                      variant="ghost"
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full justify-start text-left p-2 h-auto rounded-md transition-all duration-200",
                        isSelected
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all duration-200",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{area.name}</div>
                          {area.description && (
                            <div className="text-xs opacity-70 truncate">{area.description}</div>
                          )}
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected areas display */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {selected.slice(0, 3).map((areaId) => (
              <span
                key={areaId}
                className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md border border-primary/20 truncate max-w-24"
                title={getAreaName(areaId)}
              >
                {getAreaName(areaId)}
              </span>
            ))}
            {selected.length > 3 && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md border border-primary/20">
                +{selected.length - 3}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            Limpiar áreas
          </Button>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Wrap with error boundary
export function AreaFilter(props: AreaFilterProps) {
  return (
    <FilterErrorBoundary>
      <AreaFilterComponent {...props} />
    </FilterErrorBoundary>
  )
}