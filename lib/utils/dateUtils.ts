/**
 * Date utility functions for dashboard filtering
 */

// REMOVED: Quarter functions - using date ranges instead
// getCurrentQuarter() and getAllQuarters() removed - use date range filters

/**
 * Get the current period (month-based)
 */
export function getCurrentPeriod(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  return `${now.getFullYear()}-${month.toString().padStart(2, '0')}`
}

/**
 * Convert a date string to a Date object safely
 */
export function parseDate(dateString: string | Date): Date | null {
  if (!dateString) return null
  
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const parsedDate = parseDate(date)
  if (!parsedDate) return ''
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return parsedDate.toLocaleDateString('es-ES', { ...defaultOptions, ...options })
}

// REMOVED: Quarter-specific functions - using date ranges instead
// Use formatDate() and month names from localization files

/**
 * Get the month name in Spanish
 */
export function getMonthName(month: number): string {
  const monthNames: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  
  return monthNames[month - 1] || ''
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: string | Date): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  return parsedDate < new Date()
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: string | Date): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  return parsedDate > new Date()
}

/**
 * Get the number of days between two dates
 */
export function getDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  
  if (!start || !end) return 0
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 days")
 */
export function getRelativeTimeDescription(date: string | Date): string {
  const parsedDate = parseDate(date)
  if (!parsedDate) return ''
  
  const now = new Date()
  const diffTime = parsedDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Mañana'
  if (diffDays === -1) return 'Ayer'
  if (diffDays > 0) return `En ${diffDays} días`
  if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`
  
  return ''
}

/**
 * Check if a date is within a specific date range
 */
export function isDateInRange(date: string | Date, startDate: Date, endDate: Date): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  return parsedDate >= startDate && parsedDate <= endDate
}

/**
 * Get the start and end dates of the current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Get the start and end dates of the current month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Get the start and end dates of a custom period (3 months)
 */
export function getThreeMonthRange(startMonth?: number, year?: number): { start: Date; end: Date } {
  const currentYear = year || new Date().getFullYear()
  const currentMonth = startMonth || new Date().getMonth()
  
  const start = new Date(currentYear, currentMonth, 1)
  const end = new Date(currentYear, currentMonth + 3, 0)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * Format a date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = formatDate(start, { month: 'short', day: 'numeric' })
  const endStr = formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' })
  
  return `${startStr} - ${endStr}`
}

/**
 * Check if two dates are in the same month
 */
export function areDatesInSameMonth(date1: string | Date, date2: string | Date): boolean {
  const parsed1 = parseDate(date1)
  const parsed2 = parseDate(date2)
  
  if (!parsed1 || !parsed2) return false
  
  return parsed1.getMonth() === parsed2.getMonth() && parsed1.getFullYear() === parsed2.getFullYear()
}