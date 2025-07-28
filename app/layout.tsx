import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Stratix Dashboard - FEMA Electricidad',
  description: 'Dashboard de gestión y seguimiento de objetivos organizacionales',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
