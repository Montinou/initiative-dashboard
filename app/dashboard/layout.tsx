import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs"
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav"
import { PageTransition } from "@/components/dashboard/PageTransition"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { LanguageSwitcher } from "@/components/language-switcher"
import { DataFetchProvider } from "@/lib/contexts/data-fetch-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DataFetchProvider>
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
            <main className="flex-1 p-4 md:p-6">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </SidebarInset>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </SidebarProvider>
    </DataFetchProvider>
  )
}