import React from "react"
import { EnhancedDashboardNavigation } from "@/components/dashboard/EnhancedDashboardNavigation"
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs"
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav"
import { PageTransition } from "@/components/dashboard/PageTransition"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { DashboardAIContainer } from "@/components/stratix/dashboard-ai-container"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-50 md:flex md:w-72 md:flex-col">
        <div className="flex h-full flex-col bg-gray-900/50 backdrop-blur-xl border-r border-white/10">
          {/* Logo/Header */}
          <div className="flex h-16 items-center px-6 border-b border-white/10">
            <DashboardHeader />
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <EnhancedDashboardNavigation />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-gray-900/50 backdrop-blur-xl border-b border-white/10">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <DashboardBreadcrumbs />
            <ProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* AI Assistant Widget */}
      <DashboardAIContainer />
    </div>
  )
}