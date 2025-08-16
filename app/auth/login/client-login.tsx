'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
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
  const t = useTranslations('auth')
  
  // Get redirect URL from query params or default to dashboard
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  
  // Use existing auth context
  const { signIn, loading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Clear error when component mounts
  useEffect(() => {
    setError('')
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return // Basic validation handled by HTML5 required attr
    }
    
    // Clear any previous errors and success states
    setError('')
    setSuccess('')

    console.log('🔐 Login: Starting authentication...')
    console.log('📧 Email:', email)

    try {
      // Use existing auth context signIn function
      const { error: authError } = await signIn(email.trim().toLowerCase(), password)

      if (authError) {
        console.error('❌ Authentication failed:', authError)
        const errorMessage = getAuthErrorMessage(authError)
        setError(errorMessage)
        return
      }

      // ✅ Authentication successful - show success immediately
      console.log('✅ Authentication Success! Redirecting...')
      setSuccess(t('success.redirecting'))
      
      // Redirect immediately on auth success (profile loading happens in background)
      // This prevents any profile fetch timeouts from affecting the login UI
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 500) // Small delay to show success message

    } catch (err: any) {
      // Only handle actual authentication errors, not profile fetch errors
      console.error('❌ Authentication error:', err)
      const errorMessage = getAuthErrorMessage(err)
      setError(errorMessage)
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