import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OrgAdminLayoutClient from './layout-client'
import { Card } from '@/components/ui/card'
import { Shield, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // ✅ BEST PRACTICE: Always use getUser() for server-side authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Redirect if not authenticated
  if (authError || !user) {
    redirect('/auth/login')
  }
  
  // Get user profile with tenant information
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!user_profiles_tenant_id_fkey (
        id,
        subdomain,
        organizations!tenants_organization_id_fkey (
          id,
          name,
          description
        )
      )
    `)
    .eq('user_id', user.id)
    .single()
  
  // Handle profile not found
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="p-8 backdrop-blur-xl bg-gray-900/50 border-red-500/20 text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">
            Profile Not Found
          </h2>
          <p className="text-gray-400 mb-6">
            Your user profile could not be found. Please contact support.
          </p>
          <Button 
            onClick={() => redirect('/auth/login')} 
            className="bg-primary hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Login
          </Button>
        </Card>
      </div>
    )
  }
  
  // Check if user has admin permissions
  if (!profile.role || !['CEO', 'Admin'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="p-8 backdrop-blur-xl bg-gray-900/50 border-red-500/20 text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">
            Access Denied
          </h2>
          <p className="text-gray-400 mb-6">
            You do not have permission to access the admin panel.
          </p>
          <a href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </a>
        </Card>
      </div>
    )
  }

  // Pass the authenticated data to the client component
  return (
    <OrgAdminLayoutClient 
      profile={profile}
      tenant={profile.tenant}
    >
      {children}
    </OrgAdminLayoutClient>
  )
}