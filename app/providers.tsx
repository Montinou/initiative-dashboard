'use client'

import { AuthProvider } from '@/lib/auth-context'
import { ProfileProvider } from '@/lib/profile-context'
import { ThemeProvider } from '@/components/theme-provider'
import { DynamicTheme } from '@/components/dynamic-theme'
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DynamicTheme />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthProvider>
          <ProfileProvider>
            <SWRConfig value={swrConfig}>
              {children}
            </SWRConfig>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  )
}