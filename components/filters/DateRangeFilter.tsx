"use client"

import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DateRangeFilterProps {
  startDate: Date | null
  endDate: Date | null
  onChange: (startDate: Date | null, endDate: Date | null) => void
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onChange(date, endDate)
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    onChange(startDate, date)
  }

  const clearDates = () => {
    onChange(null, null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-white/70" />
        <span className="text-sm font-medium text-white/90">Rango de Fechas</span>
      </div>
      
      <div className="space-y-2">
        <div>
          <Label htmlFor="start-date" className="text-xs text-white/60">
            Fecha de inicio
          </Label>
          <input
            id="start-date"
            type="date"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleStartDateChange}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        
        <div>
          <Label htmlFor="end-date" className="text-xs text-white/60">
            Fecha de fin
          </Label>
          <input
            id="end-date"
            type="date"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleEndDateChange}
            min={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
            className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>
      
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearDates}
          className="w-full text-xs text-white/60 hover:text-white/80 hover:bg-white/5"
        >
          Limpiar fechas
        </Button>
      )}
    </div>
  )
}