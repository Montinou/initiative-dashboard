import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserProfile } from "@/lib/server-user-profile"

export const metadata: Metadata = {
  title: "CEO Dashboard | Executive Overview",
  description: "Strategic insights and performance metrics for executive leadership",
}

export default async function CEOLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user profile with role
  const userProfile = await getUserProfile(supabase, user.id)
  
  if (!userProfile) {
    redirect("/auth/login")
  }

  // Check if user has CEO or Admin role
  if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
    redirect("/unauthorized")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {children}
    </div>
  )
}