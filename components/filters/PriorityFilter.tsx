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
    variant: "destructive"
  },
  { 
    id: "medium", 
    label: "Media", 
    icon: Minus, 
    variant: "accent"
  },
  { 
    id: "low", 
    label: "Baja", 
    icon: ChevronDown, 
    variant: "secondary"
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
        <Flag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Prioridad</span>
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
                  ? priority.variant === "destructive"
                    ? "bg-destructive/10 text-destructive border-destructive/20 shadow-lg"
                    : priority.variant === "accent"
                    ? "bg-accent/10 text-accent-foreground border-accent/20 shadow-lg"
                    : "bg-secondary/10 text-secondary-foreground border-secondary/20 shadow-lg"
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200",
                  isSelected 
                    ? priority.variant === "destructive"
                      ? "bg-destructive/10 border-destructive/30"
                      : priority.variant === "accent"
                      ? "bg-accent/10 border-accent/30"
                      : "bg-secondary/10 border-secondary/30"
                    : "border-border"
                )}>
                  <Icon className={cn(
                    "h-3 w-3 transition-colors duration-200",
                    isSelected 
                      ? priority.variant === "destructive" ? "text-destructive"
                      : priority.variant === "accent" ? "text-accent-foreground"
                      : "text-secondary-foreground"
                      : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-sm font-medium flex-1 text-left">
                  Prioridad {priority.label}
                </span>
                {isSelected && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    priority.variant === "destructive" ? "bg-destructive" :
                    priority.variant === "accent" ? "bg-accent" :
                    "bg-secondary"
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
                  variant={config.variant as "destructive" | "secondary" | "accent"}
                  className="text-xs px-2 py-1"
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
            className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Limpiar prioridades
          </Button>
        </div>
      )}
    </div>
  )
}