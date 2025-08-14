"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProgressFilterProps {
  min: number
  max: number
  onChange: (min: number, max: number) => void
}

const progressRanges = [
  { id: "all", label: "Todos", min: 0, max: 100 },
  { id: "low", label: "0-25%", min: 0, max: 25, variant: "destructive" },
  { id: "medium-low", label: "26-50%", min: 26, max: 50, variant: "accent" },
  { id: "medium-high", label: "51-75%", min: 51, max: 75, variant: "secondary" },
  { id: "high", label: "76-100%", min: 76, max: 100, variant: "primary" },
]

export function ProgressFilter({ min, max, onChange }: ProgressFilterProps) {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)

  const getCurrentRange = () => {
    return progressRanges.find(range => range.min === min && range.max === max)
  }

  const selectRange = (range: typeof progressRanges[0]) => {
    onChange(range.min, range.max)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    const value = parseInt(e.target.value)
    if (type === 'min') {
      onChange(Math.min(value, max), max)
    } else {
      onChange(min, Math.max(value, min))
    }
  }

  const getColorClasses = (variant: string, isSelected: boolean) => {
    if (!isSelected) return ""
    
    switch (variant) {
      case "destructive":
        return "bg-destructive/10 text-destructive border-destructive/20 shadow-lg"
      case "accent":
        return "bg-accent/10 text-accent-foreground border-accent/20 shadow-lg"
      case "secondary":
        return "bg-secondary text-secondary-foreground border-secondary/20 shadow-lg"
      case "primary":
        return "bg-primary/10 text-primary border-primary/20 shadow-lg"
      default:
        return "bg-muted text-muted-foreground border-border shadow-lg"
    }
  }

  const currentRange = getCurrentRange()
  const isCustomRange = !currentRange || currentRange.id === "all"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Progreso</span>
      </div>
      
      {/* Preset Range Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {progressRanges.slice(1).map((range) => {
          const isSelected = currentRange?.id === range.id
          return (
            <Button
              key={range.id}
              variant="ghost"
              size="sm"
              onClick={() => selectRange(range)}
              className={cn(
                "flex flex-col items-center justify-center h-12 p-2 rounded-xl border transition-all duration-200 text-xs",
                isSelected
                  ? getColorClasses(range.variant, true)
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              {range.label}
            </Button>
          )
        })}
      </div>

      {/* Custom Range Sliders */}
      <div className="space-y-3 p-3 bg-muted rounded-xl border border-border">
        <div className="text-xs text-foreground font-medium">Rango personalizado</div>
        
        {/* Min Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mínimo</span>
            <span>{min}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={min}
            onChange={(e) => handleSliderChange(e, 'min')}
            onMouseDown={() => setIsDragging('min')}
            onMouseUp={() => setIsDragging(null)}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, 
                hsl(var(--primary)) 0%, 
                hsl(var(--primary)) ${min}%, 
                hsl(var(--muted)) ${min}%, 
                hsl(var(--muted)) 100%)`
            }}
          />
        </div>

        {/* Max Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Máximo</span>
            <span>{max}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={max}
            onChange={(e) => handleSliderChange(e, 'max')}
            onMouseDown={() => setIsDragging('max')}
            onMouseUp={() => setIsDragging(null)}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, 
                hsl(var(--muted)) 0%, 
                hsl(var(--muted)) ${max}%, 
                hsl(var(--primary)) ${max}%, 
                hsl(var(--primary)) 100%)`
            }}
          />
        </div>

        {/* Current Range Display */}
        <div className="text-center">
          <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full border border-primary/30">
            {min}% - {max}%
          </span>
        </div>
      </div>

      {/* Reset Button */}
      {(min > 0 || max < 100) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(0, 100)}
          className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Restablecer progreso
        </Button>
      )}

      {/* Custom CSS for slider styling */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--border));
          cursor: pointer;
          box-shadow: 0 2px 4px hsl(var(--border));
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 2px solid hsl(var(--border));
          cursor: pointer;
          box-shadow: 0 2px 4px hsl(var(--border));
        }
      `}</style>
    </div>
  )
}