"use client"

import { Activity, Clock, CheckCircle, Pause, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusFilterProps {
  selected: string[]
  onChange: (statuses: string[]) => void
}

const statuses = [
  { 
    id: "planning", 
    label: "Planificación", 
    icon: Clock, 
    color: "blue",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-100",
    borderClass: "border-blue-400/30",
    hoverClass: "hover:bg-blue-500/30"
  },
  { 
    id: "in_progress", 
    label: "En Progreso", 
    icon: Activity, 
    color: "orange",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-100",
    borderClass: "border-orange-400/30",
    hoverClass: "hover:bg-orange-500/30"
  },
  { 
    id: "completed", 
    label: "Completado", 
    icon: CheckCircle, 
    color: "green",
    bgClass: "bg-green-500/20",
    textClass: "text-green-100",
    borderClass: "border-green-400/30",
    hoverClass: "hover:bg-green-500/30"
  },
  { 
    id: "on_hold", 
    label: "En Pausa", 
    icon: Pause, 
    color: "gray",
    bgClass: "bg-gray-500/20",
    textClass: "text-gray-100",
    borderClass: "border-gray-400/30",
    hoverClass: "hover:bg-gray-500/30"
  },
]

export function StatusFilter({ selected, onChange }: StatusFilterProps) {
  const toggleStatus = (statusId: string) => {
    if (selected.includes(statusId)) {
      onChange(selected.filter(s => s !== statusId))
    } else {
      onChange([...selected, statusId])
    }
  }

  const getStatusConfig = (statusId: string) => {
    return statuses.find(s => s.id === statusId)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Estado</span>
      </div>
      
      <div className="space-y-2">
        {statuses.map((status) => {
          const isSelected = selected.includes(status.id)
          const Icon = status.icon
          
          return (
            <Button
              key={status.id}
              variant="ghost"
              onClick={() => toggleStatus(status.id)}
              className={cn(
                "w-full justify-start p-3 h-auto rounded-xl border transition-all duration-200",
                isSelected
                  ? cn(status.bgClass, status.textClass, status.borderClass, "shadow-lg")
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isSelected ? status.textClass : "text-white/70"
                )} />
                <span className="text-sm font-medium flex-1 text-left">
                  {status.label}
                </span>
                {isSelected && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status.bgClass.replace('/20', '/60')
                  )} />
                )}
              </div>
            </Button>
          )
        })}
      </div>

      {/* Selected Status Display */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {selected.map((statusId) => {
              const config = getStatusConfig(statusId)
              if (!config) return null
              return (
                <Badge
                  key={statusId}
                  variant="secondary"
                  className={cn(
                    "text-xs px-2 py-1 border",
                    config.bgClass,
                    config.textClass,
                    config.borderClass
                  )}
                >
                  {config.label}
                </Badge>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
          >
            Limpiar estados
          </Button>
        </div>
      )}
    </div>
  )
}