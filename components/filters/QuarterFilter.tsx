"use client"

import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuarterFilterProps {
  selected: string[]
  onChange: (quarters: string[]) => void
}

const quarters = [
  { id: "Q1", label: "Q1", description: "Ene-Mar" },
  { id: "Q2", label: "Q2", description: "Abr-Jun" },
  { id: "Q3", label: "Q3", description: "Jul-Sep" },
  { id: "Q4", label: "Q4", description: "Oct-Dec" },
]

export function QuarterFilter({ selected, onChange }: QuarterFilterProps) {
  const toggleQuarter = (quarterId: string) => {
    if (selected.includes(quarterId)) {
      onChange(selected.filter(q => q !== quarterId))
    } else {
      onChange([...selected, quarterId])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Trimestres</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {quarters.map((quarter) => {
          const isSelected = selected.includes(quarter.id)
          return (
            <Button
              key={quarter.id}
              variant="ghost"
              size="sm"
              onClick={() => toggleQuarter(quarter.id)}
              className={cn(
                "flex flex-col items-center justify-center h-16 p-2 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-blue-500/30 text-blue-100 border-blue-400/50 shadow-lg shadow-blue-500/20"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
              )}
            >
              <span className="font-semibold text-sm">{quarter.label}</span>
              <span className="text-xs opacity-75">{quarter.description}</span>
            </Button>
          )
        })}
      </div>
      
      {selected.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
        >
          Limpiar trimestres
        </Button>
      )}
    </div>
  )
}