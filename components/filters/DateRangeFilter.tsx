"use client"

import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onDateChange: (dates: { startDate: string | null, endDate: string | null }) => void
}

export function DateRangeFilter({ startDate, endDate, onDateChange }: DateRangeFilterProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value || null
    onDateChange({ startDate: date, endDate })
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value || null
    onDateChange({ startDate, endDate: date })
  }

  const clearDates = () => {
    onDateChange({ startDate: null, endDate: null })
  }

  const hasDateFilter = startDate || endDate
  const dateLabel = hasDateFilter 
    ? `${startDate || '...'} - ${endDate || '...'}`
    : 'Date Range'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Calendar className="h-4 w-4 mr-2" />
          {hasDateFilter ? dateLabel : 'Date Range'}
          {hasDateFilter && (
            <Badge variant="secondary" className="ml-2 h-5 px-1">
              Active
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate || ''}
              onChange={handleEndDateChange}
              min={startDate || undefined}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          
          {hasDateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDates}
              className="w-full text-destructive hover:text-destructive/80"
            >
              Clear Dates
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}