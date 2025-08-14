import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { locales } from './i18n-config'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound()

  return {
    messages: {
      ...(await import(`./locales/${locale}/common.json`)).default,
      ...(await import(`./locales/${locale}/navigation.json`)).default,
      ...(await import(`./locales/${locale}/profile.json`)).default,
      ...(await import(`./locales/${locale}/analytics.json`)).default,
      ...(await import(`./locales/${locale}/auth.json`)).default,
      ...(await import(`./locales/${locale}/dashboard.json`)).default,
      ...(await import(`./locales/${locale}/forms.json`)).default,
      ...(await import(`./locales/${locale}/validation.json`)).default,
      ...(await import(`./locales/${locale}/errors.json`)).default,
      ...(await import(`./locales/${locale}/invitations.json`)).default,
      ...(await import(`./locales/${locale}/org-admin.json`)).default,
      ...(await import(`./locales/${locale}/stratix.json`)).default,
      ...(await import(`./locales/${locale}/upload.json`)).default,
      ...(await import(`./locales/${locale}/dates.json`)).default
    },
    timeZone: 'America/Mexico_City' // Default timezone for the application
  }
})