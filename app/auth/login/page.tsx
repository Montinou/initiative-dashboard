'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getThemeFromDomain, generateThemeCSS, type CompanyTheme } from '@/lib/theme-config-simple'
import { login } from './actions'
import { ClientLogin } from './client-login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Zap, 
  Map, 
  AlertCircle, 
  Loader2,
  Building2
} from 'lucide-react'

const IconMap = {
  zap: Zap,
  map: Map,
  building: Building2
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Default to dashboard for better UX
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')
  const messageParam = searchParams.get('message')
  
  // Initialize with default theme to avoid loading state
  const [theme, setTheme] = useState<CompanyTheme>({
    companyName: 'Default',
    fullName: 'Default Professional Theme',
    domain: 'default',
    tenantSlug: 'default',
    colors: {
      primary: '#475569',
      secondary: '#E2E8F0',
      accent: '#0F766E',
      background: '#FEFEFE',
      gradientFrom: 'from-slate-50',
      gradientTo: 'to-slate-100',
      gradientVia: 'via-teal-50/30'
    },
    logo: {
      text: 'APP',
      icon: 'building'
    },
    industry: 'Business',
    description: 'Professional default theme for business applications'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Get theme based on current domain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = getThemeFromDomain(window.location.hostname)
        setTheme(currentTheme)
        
        // Update document title
        document.title = `${currentTheme.companyName} - Dashboard Login`
      } catch (error) {
        console.error('Theme loading error:', error)
        // Set default theme if there's an error
        setTheme({
          companyName: 'Stratix',
          fullName: 'Stratix Platform',
          domain: 'localhost',
          tenantId: 'stratix-demo',
          colors: {
            primary: '#6366f1',
            secondary: '#ec4899',
            accent: '#14b8a6',
            background: '#0f172a',
            gradientFrom: 'from-indigo-950',
            gradientTo: 'to-pink-950',
            gradientVia: 'via-purple-950'
          },
          logo: {
            text: 'STRATIX',
            icon: 'building'
          },
          industry: 'Enterprise Management Platform',
          description: 'Transform your organization with our comprehensive management suite'
        })
      }
    }
  }, [])

  // No need to check session here since middleware handles it

  // Form action will handle login via server action

  const IconComponent = IconMap[theme.logo?.icon as keyof typeof IconMap] || Building2

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      
      <div className={`min-h-screen bg-gradient-to-br ${theme.colors?.gradientFrom || 'from-slate-50'} ${theme.colors?.gradientVia || 'via-teal-50/30'} ${theme.colors?.gradientTo || 'to-slate-100'} flex items-center justify-center p-4 relative overflow-hidden`}>
        {/* Glassmorphism background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-white/5 to-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-br from-white/5 to-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-white/5 to-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        <div className="w-full max-w-md space-y-8">
          {/* Company Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-card/50 backdrop-blur-sm border border-border">
                <IconComponent className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {theme.companyName}
              </h1>
              <p className="text-foreground/80 font-medium">
                {theme.fullName}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {theme.industry}
              </p>
            </div>
            
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {theme.description}
            </p>
          </div>

          {/* Login Form */}
          <Card className="backdrop-blur-xl bg-card/80 border border-border shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Accede a tu dashboard de gestión
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ClientLogin />

              {/* Demo credentials removed - Users must obtain credentials from system administrators */}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Dashboard de Gestión y Seguimiento
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              © 2025 {theme.companyName}. Sistema de gestión organizacional.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}