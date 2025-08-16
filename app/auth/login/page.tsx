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
  Building2,
  Sparkles,
  ArrowRight
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
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-slow"></div>
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Company Header with enhanced styling */}
          <div className="text-center space-y-6">
            {/* Animated logo container */}
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg group-hover:blur-xl transition-all duration-300 opacity-75 group-hover:opacity-100"></div>
                <div className="relative p-5 rounded-full bg-background border-2 border-primary/20 shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                  <IconComponent className="h-14 w-14 text-primary" />
                </div>
              </div>
            </div>
            
            {/* Enhanced typography */}
            <div className="space-y-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-gradient">
                {theme.companyName}
              </h1>
              <p className="text-lg font-medium text-foreground/90">
                {theme.fullName}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>{theme.industry}</span>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              {theme.description}
            </p>
          </div>

          {/* Enhanced Login Form Card */}
          <Card className="backdrop-blur-xl bg-card/95 border border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
            {/* Decorative gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50"></div>
            <div className="absolute inset-[1px] bg-card rounded-lg"></div>
            
            <div className="relative">
              <CardHeader className="space-y-3 text-center pb-6">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Bienvenido
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium">
                  Ingresa tus credenciales para continuar
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                <ClientLogin />
                
                {/* Decorative separator */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Sistema Seguro</span>
                  </div>
                </div>
                
                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Conexión segura</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Encriptado</span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Enhanced Footer */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-12"></div>
              <p className="text-sm font-medium text-muted-foreground">
                Plataforma de Gestión Empresarial
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-12"></div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              © 2025 {theme.companyName} • Todos los derechos reservados
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