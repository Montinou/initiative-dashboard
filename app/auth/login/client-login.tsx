'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2,
  CheckCircle
} from 'lucide-react'
import { useTranslations } from 'next-intl'

export function ClientLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const t = useTranslations('auth')
  
  // Get redirect URL from query params or default to dashboard
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    console.log('🔐 Client Login: Starting...')
    console.log('📧 Email:', email)
    console.log('🌐 Current URL:', window.location.href)

    // Implementar timeout de 30 segundos para prevenir colgado
    const authTimeout = new Promise((_, reject) => {
      timeoutRef.current = setTimeout(() => {
        reject(new Error('timeout'))
      }, 30000) // 30 segundos
    })

    try {
      // Race entre auth y timeout
      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      const result = await Promise.race([authPromise, authTimeout])
      
      // Limpiar timeout si auth completó primero
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      const { data, error: authError } = result as any

      if (authError) {
        console.error('❌ Client Login Error:', authError)
        const errorMessage = getAuthErrorMessage(authError)
        setError(errorMessage)
        return
      }

      console.log('✅ Client Login Success:', {
        userId: data.user?.id,
        email: data.user?.email,
        sessionExists: !!data.session
      })

      setSuccess(t('success.redirecting'))
      
      // Small delay to ensure session is set with visual feedback
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 1000)

    } catch (err: any) {
      console.error('❌ Client Login Exception:', err)
      
      // Limpiar timeout si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (err.message === 'timeout') {
        setError(t('messages.timeout'))
      } else {
        const errorMessage = getAuthErrorMessage(err)
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex items-center gap-2 text-green-600">
            {success}
            <Loader2 className="h-4 w-4 animate-spin" />
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          {t('email')}
        </label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            className="pl-10 h-11 bg-background/50 border-input/50 placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background transition-all duration-200"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          {t('password')}
        </label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-10 pr-10 h-11 bg-background/50 border-input/50 placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background transition-all duration-200"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
        disabled={loading}
      >
        <span className="relative z-10 flex items-center justify-center">
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {t('messages.signingIn')}
            </>
          ) : (
            <>
              {t('signIn')}
              <svg
                className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
      </Button>
    </form>
  )
}