import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ThemeWrapper } from '@/components/theme-wrapper'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeWrapper>
            {children}
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  )
}
