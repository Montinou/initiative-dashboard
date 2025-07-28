import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  console.log('🎯 DashboardPage: Server component rendering...');

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get session on server-side
  const { data: { session }, error } = await supabase.auth.getSession()
  
  console.log('🔍 Server: Session check result:', session ? 'Found' : 'None');
  
  if (error) {
    console.error('🚨 Server: Session error:', error);
  }

  // Redirect to login if no session
  if (!session) {
    console.log('🚫 Server: No session, redirecting to login');
    redirect('/auth/login')
  }

  // Get user profile from server
  let userProfile = null
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('🚨 Server: Profile fetch error:', profileError);
    } else {
      userProfile = profile
      console.log('✅ Server: Profile fetched successfully');
    }
  } catch (error) {
    console.error('🚨 Server: Profile fetch exception:', error);
  }

  // Pass session and profile to client component
  return <DashboardClient />
}