// Remove framework-level configuration from this helper module.
// Keep only helpers and message loading utilities.

// Supported locales
export const locales = ['es', 'en'] as const
export type Locale = (typeof locales)[number]

// Default locale
export const defaultLocale: Locale = 'es'

// Validation function
export function isValidLocale(locale: any): locale is Locale {
  return locales.includes(locale as Locale)
}

// Load messages for a specific locale
export async function getMessagesFor(locale: string) {
  if (!isValidLocale(locale)) {
    return {}
  }

  try {
    const messages = {
      common: (await import(`@/locales/${locale}/common.json`)).default,
      navigation: (await import(`@/locales/${locale}/navigation.json`)).default,
      dashboard: (await import(`@/locales/${locale}/dashboard.json`)).default,
      auth: (await import(`@/locales/${locale}/auth.json`)).default,
      forms: (await import(`@/locales/${locale}/forms.json`)).default,
      stratix: (await import(`@/locales/${locale}/stratix.json`)).default,
      errors: (await import(`@/locales/${locale}/errors.json`)).default,
      validation: (await import(`@/locales/${locale}/validation.json`)).default,
      dates: (await import(`@/locales/${locale}/dates.json`)).default,
      invitations: (await import(`@/locales/${locale}/invitations.json`)).default,
    }
    return messages
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error)
    return {}
  }
}

// Date formatting helpers
export function formatDate(
  date: string | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
  timezone?: string
) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeZone: timezone || 'UTC',
    ...options
  }
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
}

// Number formatting helpers
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(locale, options).format(value)
}

// Currency formatting helpers
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options
  }).format(value)
}

// Percentage formatting
export function formatPercentage(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
    ...options
  }).format(value / 100)
}

// Get locale from cookie or headers
export function getLocaleFromRequest(request: Request): Locale {
  // Check cookie first
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(cookie => {
        const [key, value] = cookie.split('=')
        return [key, decodeURIComponent(value || '')]
      })
    )
    
    const cookieLocale = cookies['NEXT_LOCALE']
    if (isValidLocale(cookieLocale)) {
      return cookieLocale
    }
  }
  
  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
    
    for (const lang of languages) {
      if (lang === 'es' || lang === 'en') {
        return lang as Locale
      }
    }
  }
  
  return defaultLocale
}