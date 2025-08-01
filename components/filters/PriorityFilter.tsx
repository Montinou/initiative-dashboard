"use client"

import { Flag, ChevronUp, Minus, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PriorityFilterProps {
  selected: string[]
  onChange: (priorities: string[]) => void
}

const priorities = [
  { 
    id: "high", 
    label: "Alta", 
    icon: ChevronUp, 
    color: "red",
    bgClass: "bg-red-500/20",
    textClass: "text-red-100",
    borderClass: "border-red-400/30",
    shadowClass: "shadow-red-500/20"
  },
  { 
    id: "medium", 
    label: "Media", 
    icon: Minus, 
    color: "yellow",
    bgClass: "bg-yellow-500/20",
    textClass: "text-yellow-100",
    borderClass: "border-yellow-400/30",
    shadowClass: "shadow-yellow-500/20"
  },
  { 
    id: "low", 
    label: "Baja", 
    icon: ChevronDown, 
    color: "green",
    bgClass: "bg-green-500/20",
    textClass: "text-green-100",
    borderClass: "border-green-400/30",
    shadowClass: "shadow-green-500/20"
  },
]

export function PriorityFilter({ selected, onChange }: PriorityFilterProps) {
  const togglePriority = (priorityId: string) => {
    if (selected.includes(priorityId)) {
      onChange(selected.filter(p => p !== priorityId))
    } else {
      onChange([...selected, priorityId])
    }
  }

  const getPriorityConfig = (priorityId: string) => {
    return priorities.find(p => p.id === priorityId)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Prioridad</span>
      </div>
      
      <div className="space-y-2">
        {priorities.map((priority) => {
          const isSelected = selected.includes(priority.id)
          const Icon = priority.icon
          
          return (
            <Button
              key={priority.id}
              variant="ghost"
              onClick={() => togglePriority(priority.id)}
              className={cn(
                "w-full justify-start p-3 h-auto rounded-xl border transition-all duration-200",
                isSelected
                  ? cn(
                      priority.bgClass, 
                      priority.textClass, 
                      priority.borderClass, 
                      "shadow-lg",
                      priority.shadowClass
                    )
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200",
                  isSelected 
                    ? cn(priority.bgClass, priority.borderClass)
                    : "border-white/20"
                )}>
                  <Icon className={cn(
                    "h-3 w-3 transition-colors duration-200",
                    isSelected ? priority.textClass : "text-white/70"
                  )} />
                </div>
                <span className="text-sm font-medium flex-1 text-left">
                  Prioridad {priority.label}
                </span>
                {isSelected && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    priority.bgClass.replace('/20', '/60')
                  )} />
                )}
              </div>
            </Button>
          )
        })}
      </div>

      {/* Selected Priority Display */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {selected.map((priorityId) => {
              const config = getPriorityConfig(priorityId)
              if (!config) return null
              return (
                <Badge
                  key={priorityId}
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
            Limpiar prioridades
          </Button>
        </div>
      )}
    </div>
  )
}