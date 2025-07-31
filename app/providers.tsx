import { ThemeProvider } from '@/components/theme-provider'
import { DynamicTheme } from '@/components/dynamic-theme'
import { ClientProviders } from './client-providers'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function Providers({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Get session on server side
  const { data: { session } } = await supabase.auth.getSession()
  
  // Get user profile if session exists
  let profile = null
  if (session?.user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    profile = data
  }
  
  return (
    <>
      <DynamicTheme />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ClientProviders session={session} profile={profile}>
          {children}
        </ClientProviders>
      </ThemeProvider>
    </>
  )
}