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
  { id: "low", label: "0-25%", min: 0, max: 25, color: "red" },
  { id: "medium-low", label: "26-50%", min: 26, max: 50, color: "orange" },
  { id: "medium-high", label: "51-75%", min: 51, max: 75, color: "yellow" },
  { id: "high", label: "76-100%", min: 76, max: 100, color: "green" },
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

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      red: isSelected 
        ? "bg-red-500/30 text-red-100 border-red-400/50 shadow-lg shadow-red-500/20"
        : "hover:bg-red-500/20 hover:border-red-400/30",
      orange: isSelected
        ? "bg-orange-500/30 text-orange-100 border-orange-400/50 shadow-lg shadow-orange-500/20"
        : "hover:bg-orange-500/20 hover:border-orange-400/30",
      yellow: isSelected
        ? "bg-yellow-500/30 text-yellow-100 border-yellow-400/50 shadow-lg shadow-yellow-500/20"
        : "hover:bg-yellow-500/20 hover:border-yellow-400/30",
      green: isSelected
        ? "bg-green-500/30 text-green-100 border-green-400/50 shadow-lg shadow-green-500/20"
        : "hover:bg-green-500/20 hover:border-green-400/30",
    }
    return colors[color as keyof typeof colors] || ""
  }

  const currentRange = getCurrentRange()
  const isCustomRange = !currentRange || currentRange.id === "all"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Progreso</span>
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
                  ? getColorClasses(range.color, true)
                  : cn(
                      "bg-white/5 text-white/70 border-white/10 hover:text-white hover:border-white/20",
                      getColorClasses(range.color, false)
                    )
              )}
            >
              {range.label}
            </Button>
          )
        })}
      </div>

      {/* Custom Range Sliders */}
      <div className="space-y-3 p-3 bg-white/5 rounded-xl border border-white/10">
        <div className="text-xs text-white/90 font-medium">Rango personalizado</div>
        
        {/* Min Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/70">
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
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, 
                hsl(var(--primary) / 0.6) 0%, 
                hsl(var(--primary) / 0.6) ${min}%, 
                rgba(255,255,255,0.1) ${min}%, 
                rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>

        {/* Max Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/70">
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
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, 
                rgba(255,255,255,0.1) 0%, 
                rgba(255,255,255,0.1) ${max}%, 
                hsl(var(--primary) / 0.6) ${max}%, 
                hsl(var(--primary) / 0.6) 100%)`
            }}
          />
        </div>

        {/* Current Range Display */}
        <div className="text-center">
          <span className="bg-purple-500/20 text-purple-100 text-xs px-3 py-1 rounded-full border border-purple-400/30">
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
          className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
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
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
          border: 2px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
          border: 2px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}