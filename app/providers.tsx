'use client'

import { AuthProvider } from '@/lib/auth-context'
import { ProfileProvider } from '@/lib/profile-context'
import { ThemeProvider } from '@/components/theme-provider'
import { AccessibilityProvider } from '@/components/ui/accessibility'
import { TenantTheme } from '@/components/tenant-theme'
import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import { NextIntlClientProvider } from 'next-intl'

interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
}

interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  full_name?: string | null;
  role: string;
  area_id?: string | null;
  [key: string]: unknown;
}

interface ProvidersProps {
  children: React.ReactNode
  initialTenantId?: string | null
  initialSession?: UserSession | null
  initialProfile?: UserProfile | null
  locale?: string
  messages?: Record<string, unknown>
}

export function Providers({ children, initialTenantId, initialSession, initialProfile, locale, messages }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TenantTheme tenantId={initialTenantId} />
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
  )
}
