'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { RoleNavigation } from '@/components/role-navigation'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  showBackButton?: boolean
  backHref?: string
}

export function AppLayout({ 
  children, 
  title = "Dashboard", 
  description,
  showBackButton = false,
  backHref = "/dashboard"
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Collapsible Navigation Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-50">
        <RoleNavigation collapsible />
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <Link href={backHref}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                {description && (
                  <p className="text-white/70">{description}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  )
}
