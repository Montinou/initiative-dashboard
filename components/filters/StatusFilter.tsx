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
    variant: "secondary"
  },
  { 
    id: "in_progress", 
    label: "En Progreso", 
    icon: Activity, 
    variant: "accent"
  },
  { 
    id: "completed", 
    label: "Completado", 
    icon: CheckCircle, 
    variant: "primary"
  },
  { 
    id: "on_hold", 
    label: "En Pausa", 
    icon: Pause, 
    variant: "muted"
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
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Estado</span>
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
                  ? status.variant === "primary" 
                    ? "bg-primary/10 text-primary border-primary/20 shadow-lg"
                    : status.variant === "accent"
                    ? "bg-accent/10 text-accent-foreground border-accent/20 shadow-lg"
                    : status.variant === "secondary"
                    ? "bg-secondary/10 text-secondary-foreground border-secondary/20 shadow-lg"
                    : "bg-muted text-muted-foreground border-border shadow-lg"
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isSelected 
                    ? status.variant === "primary" ? "text-primary"
                    : status.variant === "accent" ? "text-accent-foreground"
                    : status.variant === "secondary" ? "text-secondary-foreground"
                    : "text-muted-foreground"
                    : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium flex-1 text-left">
                  {status.label}
                </span>
                {isSelected && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status.variant === "primary" ? "bg-primary" :
                    status.variant === "accent" ? "bg-accent" :
                    status.variant === "secondary" ? "bg-secondary" : 
                    "bg-muted-foreground"
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
                  variant={config.variant as "primary" | "secondary" | "accent" | "muted"}
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
            Limpiar estados
          </Button>
        </div>
      )}
    </div>
  )
}