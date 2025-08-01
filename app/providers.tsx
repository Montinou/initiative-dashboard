import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { DynamicTheme } from '@/components/dynamic-theme'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function Providers({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Get session with tokens for API calls
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const user = session?.user || null
  
  // Get user profile if authenticated user exists
  let profile = null
  if (user && !sessionError) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
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
        <AuthProvider initialSession={session} initialProfile={profile}>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </>
  )
}