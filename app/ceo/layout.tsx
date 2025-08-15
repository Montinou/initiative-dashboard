import React from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getUserProfile } from "@/lib/server-user-profile"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { LanguageSwitcher } from "@/components/language-switcher"

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-card/50 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <DashboardBreadcrumbs />
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher variant="select" className="w-[160px]" showFlag={true} showLabel={true} />
              <ProfileDropdown showName={false} />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}