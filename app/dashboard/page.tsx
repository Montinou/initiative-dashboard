import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PremiumDashboard from '@/dashboard/dashboard'

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

  console.log('✅ Server: Session verified, rendering dashboard');

  // Return the dashboard directly - AuthProvider in layout will handle the session
  return <PremiumDashboard />
}