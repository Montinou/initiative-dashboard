'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getThemeFromDomain, generateThemeCSS, type CompanyTheme } from '@/lib/theme-config-simple'
import { useDarkMode } from '@/hooks/useDarkMode'
import { login } from './actions'
import { ClientLogin } from './client-login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'
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
  ArrowRight,
  Moon,
  Sun
} from 'lucide-react'

const IconMap = {
  zap: Zap,
  map: Map,
  building: Building2
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const t = useTranslations('auth')
  
  // Default to dashboard for better UX
  const redirectTo = searchParams?.get('redirect') || '/dashboard'
  const errorParam = searchParams?.get('error')
  const messageParam = searchParams?.get('message')
  
  // Initialize with Stratix theme as default for login (no tenant)
  const [theme, setTheme] = useState<CompanyTheme>({
    companyName: 'STRATIX',
    fullName: 'Plataforma de Gestión Empresarial',
    domain: 'default',
    tenantSlug: 'default',
    colors: {
      primary: 'hsl(245 59% 52%)', // Púrpura de Stratix
      secondary: 'hsl(17 80% 61%)', // Coral de Stratix
      accent: 'hsl(245 59% 52%)', // Mismo púrpura
      background: 'hsl(0 0% 100%)', // Fondo blanco por defecto
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-orange-50',
      gradientVia: 'via-pink-50/30'
    },
    logo: {
      text: 'STRATIX',
      icon: 'building'
    },
    industry: 'Plataforma de Gestión',
    description: 'Transforma tu organización con elegancia y eficiencia'
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
        // Set Stratix as fallback theme para login sin tenant
        setTheme({
          companyName: 'STRATIX',
          fullName: 'Plataforma de Gestión Empresarial',
          domain: 'localhost',
          tenantSlug: 'default',
          colors: {
            primary: 'hsl(245 59% 52%)', // Púrpura de Stratix
            secondary: 'hsl(17 80% 61%)', // Coral de Stratix
            accent: 'hsl(245 59% 52%)', // Mismo púrpura
            background: 'hsl(0 0% 100%)', // Fondo blanco por defecto
            gradientFrom: 'from-purple-50',
            gradientTo: 'to-orange-50',
            gradientVia: 'via-pink-50/30'
          },
          logo: {
            text: 'STRATIX',
            icon: 'building'
          },
          industry: 'Plataforma de Gestión',
          description: 'Transforma tu organización con elegancia y eficiencia'
        })
      }
    }
  }, [])

  // No need to check session here since middleware handles it

  // Form action will handle login via server action

  const IconComponent = IconMap[theme.logo?.icon as keyof typeof IconMap] || Building2

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme, isDarkMode) }} />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Theme toggle button */}
        <div className="absolute top-6 right-6 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Dynamic floating elements based on theme */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary accent orb */}
          <div 
            className={`absolute -top-32 -right-32 w-64 h-64 rounded-full ${isDarkMode ? 'mix-blend-screen' : 'mix-blend-multiply'} filter blur-2xl opacity-60 animate-float`}
            style={{
              background: `linear-gradient(to bottom right, hsl(var(--theme-primary) / 0.1), hsl(var(--theme-primary) / 0.05))`
            }}
          ></div>
          {/* Accent orb */}
          <div 
            className={`absolute -bottom-32 -left-32 w-64 h-64 rounded-full ${isDarkMode ? 'mix-blend-screen' : 'mix-blend-multiply'} filter blur-2xl opacity-60 animate-float-delayed`}
            style={{
              background: `linear-gradient(to bottom right, hsl(var(--theme-accent) / 0.1), hsl(var(--theme-accent) / 0.05))`
            }}
          ></div>
          {/* Center glow */}
          <div 
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full ${isDarkMode ? 'mix-blend-screen' : 'mix-blend-multiply'} filter blur-3xl opacity-40 animate-pulse-slow`}
            style={{
              background: `linear-gradient(to bottom right, hsl(var(--theme-primary) / 0.05), hsl(var(--theme-secondary) / 0.05))`
            }}
          ></div>
        </div>
        
        {/* Subtle pattern for depth */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[length:60px_60px]"></div>
        </div>
        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Company Header with enhanced styling */}
          <div className="text-center space-y-6">
            {/* Logo container following shadcn pattern */}
            <div className="flex justify-center">
              <div className="relative group">
                <div 
                  className="absolute inset-0 rounded-full blur-lg group-hover:blur-xl transition-all duration-300 opacity-70 group-hover:opacity-90"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--theme-primary) / 0.2), hsl(var(--theme-accent) / 0.2))`
                  }}
                ></div>
                <div className="relative p-6 rounded-full bg-card border border-border shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                  <IconComponent 
                    className="h-16 w-16"
                    style={{ color: `hsl(var(--theme-primary))` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Typography using custom theme variables */}
            <div className="space-y-3">
              <h1 
                className="text-4xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, hsl(var(--theme-primary)), hsl(var(--theme-primary) / 0.8), hsl(var(--theme-accent)))`
                }}
              >
                {theme.companyName}
              </h1>
              <p className="text-lg font-medium text-foreground/90">
                {theme.fullName}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles 
                  className="h-4 w-4"
                  style={{ color: `hsl(var(--theme-accent))` }}
                />
                <span>{theme.industry}</span>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              {theme.description}
            </p>
          </div>

          {/* Login Form Card using shadcn pattern */}
          <Card className="bg-card border border-border shadow-2xl hover:shadow-3xl transition-all duration-500">
            <div className="relative">
              <CardHeader className="space-y-4 text-center pb-8">
                <CardTitle className="text-3xl font-bold text-foreground">
                  {t('login.welcome')}
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium text-base">
                  {t('login.enterCredentials')}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                <ClientLogin />
                
                {/* Separator using shadcn pattern */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('login.secureSystem')}</span>
                  </div>
                </div>
                
                {/* Security badges using custom theme colors */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: `hsl(var(--theme-accent))` }}
                    ></div>
                    <span>{t('login.secureConnection')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>{t('login.encrypted')}</span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Footer using shadcn pattern */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-12"></div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('login.businessPlatform')}
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-12"></div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              © 2025 {theme.companyName} • {t('login.copyright')}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth')
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('login.loading')}</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}