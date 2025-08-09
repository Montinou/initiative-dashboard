import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ThemeWrapper } from '@/components/theme-wrapper'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { DialogflowChatWidget } from '@/components/dialogflow-chat-widget'

export const metadata: Metadata = {
  title: 'Stratix Dashboard',
  description: 'Dashboard de gestión y seguimiento de objetivos organizacionales',
  generator: 'Next.js',
  manifest: '/manifest.json',
  themeColor: '#6366f1',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenantId = await getTenantInfo()
  
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>
        <Providers initialTenantId={tenantId}>
          <ThemeWrapper initialTenantId={tenantId}>
            {children}
            {/* Widget del chat de Dialogflow - Solo visible cuando hay sesión */}
            {tenantId && <DialogflowChatWidget position="bottom-right" />}
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  )
}
