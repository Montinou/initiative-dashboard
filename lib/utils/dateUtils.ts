/**
 * Date utility functions for dashboard filtering
 */

/**
 * Get the current quarter (Q1, Q2, Q3, Q4)
 */
export function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // getMonth() returns 0-11
  const quarter = Math.ceil(month / 3)
  return `Q${quarter}`
}

/**
 * Get all quarters for the current year
 */
export function getAllQuarters(): string[] {
  return ['Q1', 'Q2', 'Q3', 'Q4']
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

/**
 * Get the quarter name in Spanish
 */
export function getQuarterName(quarter: string): string {
  const quarterNames: Record<string, string> = {
    'Q1': 'Primer Trimestre',
    'Q2': 'Segundo Trimestre', 
    'Q3': 'Tercer Trimestre',
    'Q4': 'Cuarto Trimestre'
  }
  
  return quarterNames[quarter] || quarter
}

/**
 * Get the months for a given quarter
 */
export function getQuarterMonths(quarter: string): string[] {
  const quarterMonths: Record<string, string[]> = {
    'Q1': ['Enero', 'Febrero', 'Marzo'],
    'Q2': ['Abril', 'Mayo', 'Junio'],
    'Q3': ['Julio', 'Agosto', 'Septiembre'],
    'Q4': ['Octubre', 'Noviembre', 'Diciembre']
  }
  
  return quarterMonths[quarter] || []
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
 * Check if a date is within a specific quarter and year
 */
export function isDateInQuarter(date: string | Date, quarter: string, year?: number): boolean {
  const parsedDate = parseDate(date)
  if (!parsedDate) return false
  
  const targetYear = year || new Date().getFullYear()
  const dateYear = parsedDate.getFullYear()
  
  if (dateYear !== targetYear) return false
  
  const month = parsedDate.getMonth() + 1
  const dateQuarter = Math.ceil(month / 3)
  const quarterNumber = parseInt(quarter.replace('Q', ''))
  
  return dateQuarter === quarterNumber
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
 * Get the start and end dates of the current quarter
 */
export function getCurrentQuarterRange(): { start: Date; end: Date } {
  const now = new Date()
  const quarter = Math.ceil((now.getMonth() + 1) / 3)
  const year = now.getFullYear()
  
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  
  const endMonth = startMonth + 3
  const end = new Date(year, endMonth, 0)
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
 * Check if two dates are in the same quarter
 */
export function areDatesInSameQuarter(date1: string | Date, date2: string | Date): boolean {
  const parsed1 = parseDate(date1)
  const parsed2 = parseDate(date2)
  
  if (!parsed1 || !parsed2) return false
  
  const quarter1 = Math.ceil((parsed1.getMonth() + 1) / 3)
  const quarter2 = Math.ceil((parsed2.getMonth() + 1) / 3)
  
  return quarter1 === quarter2 && parsed1.getFullYear() === parsed2.getFullYear()
}