'use client'

import { AuthProvider } from '@/lib/auth-context'
import { ProfileProvider } from '@/lib/profile-context'
import { TenantProvider } from '@/lib/tenant-context'
import { ThemeProvider } from '@/components/theme-provider'
import { DynamicTheme } from '@/components/dynamic-theme'
import { AccessibilityProvider } from '@/components/ui/accessibility'
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import { NextIntlClientProvider } from 'next-intl'

interface ProvidersProps {
  children: React.ReactNode
  initialTenantId?: string | null
  initialSession?: any | null
  initialProfile?: any | null
  locale?: string
  messages?: any
}

export function Providers({ children, initialTenantId, initialSession, initialProfile, locale, messages }: ProvidersProps) {
  return (
    <>
      <DynamicTheme />
      <TenantProvider initialTenantId={initialTenantId}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AccessibilityProvider>
            <AuthProvider initialSession={initialSession} initialProfile={initialProfile}>
              <ProfileProvider initialSession={initialSession} initialProfile={initialProfile}>
                <SWRConfig value={swrConfig}>
                  <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                  </NextIntlClientProvider>
                </SWRConfig>
              </ProfileProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </TenantProvider>
    </>
  )
}
