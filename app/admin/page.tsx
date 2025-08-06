'use client'

import { RoleNavigation } from "@/components/role-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Settings, Users, Target, ArrowLeft } from "lucide-react"
import { useTenantTheme } from '@/lib/tenant-context'
import { generateThemeCSS } from '@/lib/theme-config'
import { ProtectedRoute } from '@/components/protected-route'
import Link from "next/link"

export default function AdminPage() {
  // Use theme from TenantProvider instead of getThemeFromDomain
  const theme = useTenantTheme()

  return (
    <ProtectedRoute requiredRole={['CEO', 'Admin']}>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-50">
        <RoleNavigation />
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
              <p className="text-white/70">System administration and configuration</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Management
                </CardTitle>
                <CardDescription className="text-white/70">
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/users">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                    Manage Users
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Areas & Departments
                </CardTitle>
                <CardDescription className="text-white/70">
                  Configure organizational structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/areas">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                    Manage Areas
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  System Settings
                </CardTitle>
                <CardDescription className="text-white/70">
                  Configure system preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  System Config
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Administration Dashboard
              </CardTitle>
              <CardDescription className="text-white/70">
                Central control panel for system administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Admin Panel</h3>
                <p className="text-white/70 mb-4">Advanced administration features</p>
                <p className="text-sm text-white/50">
                  Features: User roles • System monitoring • Data management • Security settings
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      </div>
    </ProtectedRoute>
  )
}