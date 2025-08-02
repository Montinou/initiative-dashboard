import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ThemeWrapper } from '@/components/theme-wrapper'

export const metadata: Metadata = {
  title: 'Stratix Dashboard',
  description: 'Dashboard de gestión y seguimiento de objetivos organizacionales',
  generator: 'Next.js',
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
