import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ThemeProvider } from '@/components/theme-provider'
import { TenantTheme } from '@/components/tenant-theme'
import { GeminiChat } from '@/components/gemini-chat'
import TDZErrorBoundary from '@/components/error-boundary/TDZErrorBoundary'
import ChunkLoadErrorBoundary from '@/components/error-boundary/ChunkLoadErrorBoundary'
import { createClient } from '@/utils/supabase/server'
import { cookies, headers } from 'next/headers'
import { getMessagesFor, isValidLocale, defaultLocale } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Stratix Dashboard',
  description: 'Dashboard de gestión y seguimiento de objetivos organizacionales',
  generator: 'Next.js',
  manifest: '/manifest.json',
  icons: {
    icon: '/placeholder-logo.svg',
    apple: '/placeholder-logo.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stratix',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Stratix Dashboard',
    'application-name': 'Stratix Dashboard',
    'msapplication-TileColor': '#6366f1',
    'msapplication-config': '/browserconfig.xml',
  },
}

export const viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

async function getTenantInfo() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }
    
    // Get user profile with tenant info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()
    
    return profile?.tenant_id || null
  } catch (error) {
    console.error('Error fetching tenant info:', error)
    return null
  }
}

async function getInitialSessionAndProfile() {
  const supabase = await createClient()
  // IMPORTANT: Always use getUser() on server-side per Supabase best practices
  // This verifies the JWT and cannot be spoofed (docs/supabase-sesion.md line 538)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { initialSession: null, initialProfile: null }
  const userId = user.id
  // Minimal profile for hydration
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      id, user_id, tenant_id, email, full_name, role, area_id,
      area:area_id ( id, name )
    `)
    .eq('user_id', userId)
    .single()
  // For server components, we only pass profile data (user is verified server-side)
  return { initialSession: null, initialProfile: profile || null }
}

async function resolveLocale() {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale
  const hdrs = await headers()
  const acceptLanguage = hdrs.get('accept-language') || ''
  const langs = acceptLanguage.split(',').map((lang) => lang.split(';')[0].trim().substring(0, 2))
  for (const lang of langs) {
    if (isValidLocale(lang)) return lang
  }
  return defaultLocale
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenantId = await getTenantInfo()
  const { initialSession, initialProfile } = await getInitialSessionAndProfile()

  const locale = await resolveLocale()
  const messages = await getMessagesFor(locale)
  
  return (
    <html lang={locale} suppressHydrationWarning className="dark">
      <body className="bg-background text-foreground antialiased">
        <ChunkLoadErrorBoundary>
          <TDZErrorBoundary>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <TenantTheme tenantId={tenantId} />
              <Providers initialTenantId={tenantId} initialSession={initialSession} initialProfile={initialProfile} locale={locale} messages={messages}>
                {children}
                <GeminiChat />
              </Providers>
            </ThemeProvider>
          </TDZErrorBoundary>
        </ChunkLoadErrorBoundary>
      </body>
    </html>
  )
}
