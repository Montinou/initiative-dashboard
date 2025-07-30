'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Menu, X } from 'lucide-react'
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
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Fixed Navigation Header */}
      <header className={`bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 transition-all duration-300 ${
        isNavbarCollapsed && !isMobileMenuOpen ? 'h-16' : ''
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Desktop Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}
            >
              <Menu className={`h-5 w-5 transition-transform duration-200 ${
                isNavbarCollapsed ? 'rotate-180' : ''
              }`} />
            </Button>

            {/* Navigation Content */}
            <div className={`flex-1 ${isNavbarCollapsed && !isMobileMenuOpen ? 'hidden' : ''}`}>
              <RoleNavigation collapsible />
            </div>
          </div>

          {/* Mobile Menu Content */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-4 pt-4 border-t border-white/10">
              <RoleNavigation collapsible />
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content with proper spacing */}
      <main className="flex-1 p-6 overflow-auto">
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
