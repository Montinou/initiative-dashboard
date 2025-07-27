'use client'

import { useState, useEffect } from 'react'
import { RoleNavigation } from "@/components/role-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, ArrowLeft } from "lucide-react"
import { getThemeFromDomain, generateThemeCSS } from '@/lib/theme-config'
import { AuthGuard } from '@/lib/auth-guard'
import Link from "next/link"

export default function AreasPage() {
  const [theme, setTheme] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = getThemeFromDomain(window.location.hostname)
        setTheme(currentTheme)
      } catch (error) {
        console.error('Theme loading error:', error)
      }
    }
  }, [])

  return (
    <AuthGuard>
      <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <RoleNavigation />
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Areas Management</h1>
                <p className="text-white/70">Manage organizational areas and departments</p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Area
            </Button>
          </div>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Organizational Areas
              </CardTitle>
              <CardDescription className="text-white/70">
                Configure departments, divisions, and business areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Areas Management</h3>
                <p className="text-white/70 mb-4">This page is under development</p>
                <p className="text-sm text-white/50">
                  Features: Create areas • Assign managers • Set objectives • Track performance
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      </div>
    </AuthGuard>
  )
}