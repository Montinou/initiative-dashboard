import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { i18nConfig } from './i18n-config'

const { locales, defaultLocale } = i18nConfig

function getLocale(request: NextRequest): string {
  // Check for locale cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const detectedLocale = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().substring(0, 2))
      .find(lang => locales.includes(lang as any))
    
    if (detectedLocale) {
      return detectedLocale
    }
  }

  return defaultLocale
}

export async function middleware(request: NextRequest) {
  // Log middleware execution in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🛡️ Middleware: ${request.method} ${request.nextUrl.pathname}`)
  }
  
  // First, handle Supabase session
  const supabaseResponse = await updateSession(request)
  
  // Then, handle locale
  const locale = getLocale(request)
  
  // Set locale cookie if not present or different
  const currentLocaleCookie = request.cookies.get('NEXT_LOCALE')?.value
  if (!currentLocaleCookie || currentLocaleCookie !== locale) {
    supabaseResponse.cookies.set('NEXT_LOCALE', locale, {
      httpOnly: false, // Allow client-side access for language switcher
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 31536000, // 1 year
      path: '/'
    })
  }
  
  // Add locale to headers for server components
  supabaseResponse.headers.set('x-locale', locale)
  
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
}