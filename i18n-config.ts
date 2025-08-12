export const i18nConfig = {
  locales: ['es', 'en'] as const,
  defaultLocale: 'es' as const,
} as const

export type Locale = (typeof i18nConfig.locales)[number]

// Helper to check if a string is a valid locale
export function isValidLocale(locale: string): locale is Locale {
  return i18nConfig.locales.includes(locale as Locale)
}

// Default locale is Spanish
export const locales = i18nConfig.locales
export const defaultLocale = i18nConfig.defaultLocale