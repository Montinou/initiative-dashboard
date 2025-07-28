'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getThemeFromDomain, generateThemeCSS, type CompanyTheme } from '@/lib/theme-config'
import { login } from './actions'
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
  
  const [theme, setTheme] = useState<CompanyTheme | null>(null)
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

  if (!theme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Cargando...</p>
        </div>
      </div>
    )
  }

  const IconComponent = IconMap[theme.logo?.icon as keyof typeof IconMap] || Building2

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      
      <div className={`min-h-screen bg-gradient-to-br ${theme.colors.gradientFrom} ${theme.colors.gradientVia} ${theme.colors.gradientTo} flex items-center justify-center p-4 relative overflow-hidden`}>
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
              <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <IconComponent className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {theme.companyName}
              </h1>
              <p className="text-white/80 font-medium">
                {theme.fullName}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {theme.industry}
              </p>
            </div>
            
            <p className="text-white/70 text-sm max-w-sm mx-auto">
              {theme.description}
            </p>
          </div>

          {/* Login Form */}
          <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold text-white">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-white/70">
                Accede a tu dashboard de gestión
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form 
                action={login} 
                className="space-y-6"
                onSubmit={() => console.log('🚀 Form submitted!')}
              >
                {(errorParam || messageParam) && (
                  <Alert className={`${errorParam ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-green-500/10 border-green-500/20 text-green-200'}`}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorParam || messageParam}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white font-medium">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      defaultValue={email}
                      placeholder="tu@email.com"
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      defaultValue={password}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold theme-button-primary hover:opacity-90 border border-white/20 transition-all duration-200 backdrop-blur-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              {/* Demo Credentials Helper */}
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white font-medium text-sm mb-2">Cuentas de Demostración:</h4>
                <div className="space-y-1 text-xs text-white/70">
                  <div>
                    <span className="font-medium text-white/80">CEO:</span> {theme.tenantId === 'fema-electricidad' ? 'ceo@fema.com' : 
                      theme.tenantId === 'siga-turismo' ? 'ceo@siga.com' : 'ceo@stratix.com'}
                  </div>
                  <div>
                    <span className="font-medium text-white/80">Admin:</span> {theme.tenantId === 'fema-electricidad' ? 'admin@fema.com' : 
                      theme.tenantId === 'siga-turismo' ? 'admin@siga.com' : 'admin@stratix.com'}
                  </div>
                  <div>
                    <span className="font-medium text-white/80">Contraseña:</span> Password123!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <p className="text-white/50 text-sm">
              Dashboard de Gestión y Seguimiento
            </p>
            <p className="text-white/40 text-xs mt-1">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}