import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, area_id, is_active')
    .eq('user_id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    redirect('/auth/login')
  }

  // Check if user is a manager with an assigned area
  if (profile.role !== 'Manager' || !profile.area_id) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  )
}