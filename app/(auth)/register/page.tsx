'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Icons } from '@/components/ui/icons'
import { Mail, Lock, User, AlertCircle, Building2, MapPin, Zap, Loader2, Check, X } from 'lucide-react'
import { isAuthApiError } from '@supabase/supabase-js'
import { getTenantFromDomain } from '@/lib/auth/tenant-detection'
import { getThemeForTenant } from '@/lib/theme-config'

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [tenant, setTenant] = useState<any>(null)
  const [theme, setTheme] = useState<any>(null)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'bg-red-500'
  })
  
  // Detect tenant from subdomain and apply theme
  useEffect(() => {
    const detectTenant = async () => {
      const tenantInfo = getTenantFromDomain(window.location.hostname)
      setTenant(tenantInfo)
      
      const tenantTheme = getThemeForTenant(tenantInfo.subdomain)
      setTheme(tenantTheme)
      
      // Apply theme CSS variables
      if (tenantTheme) {
        const root = document.documentElement
        root.style.setProperty('--theme-primary', tenantTheme.primary)
        root.style.setProperty('--theme-secondary', tenantTheme.secondary)
        root.style.setProperty('--theme-accent', tenantTheme.accent)
        root.style.setProperty('--theme-background', tenantTheme.background)
        root.style.setProperty('--theme-gradient-from', tenantTheme.gradientFrom)
        root.style.setProperty('--theme-gradient-to', tenantTheme.gradientTo)
        root.style.setProperty('--theme-gradient-via', tenantTheme.gradientVia)
      }
    }
    
    detectTenant()
    
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [])
  
  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: [], color: 'bg-gray-300' })
      return
    }
    
    let score = 0
    const feedback: string[] = []
    
    // Length check
    if (password.length >= 8) {
      score += 25
    } else {
      feedback.push('At least 8 characters')
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25
    } else {
      feedback.push('Include uppercase letter')
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 25
    } else {
      feedback.push('Include lowercase letter')
    }
    
    // Number or special character check
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
      score += 25
    } else {
      feedback.push('Include number or special character')
    }
    
    let color = 'bg-red-500'
    if (score >= 75) color = 'bg-green-500'
    else if (score >= 50) color = 'bg-yellow-500'
    else if (score >= 25) color = 'bg-orange-500'
    
    setPasswordStrength({ score, feedback, color })
  }, [password])
  
  const handleAuthError = (error: any) => {
    if (!isAuthApiError(error)) return 'An unexpected error occurred'
    
    switch (error.code) {
      case 'user_already_exists':
        return 'An account with this email already exists'
      case 'weak_password':
        return 'Password is too weak. Please choose a stronger password'
      case 'over_email_send_rate_limit':
        return 'Too many attempts. Please wait before trying again'
      case 'email_address_invalid':
        return 'Please enter a valid email address'
      default:
        return error.message || 'Registration failed'
    }
  }
  
  const validateForm = () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields')
      return false
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return false
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    
    if (passwordStrength.score < 50) {
      setError('Please choose a stronger password')
      return false
    }
    
    if (!acceptTerms) {
      setError('You must accept the terms and conditions')
      return false
    }
    
    return true
  }
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            tenant_subdomain: tenant?.subdomain
          }
        }
      })
      
      if (error) throw error
      
      // Check if email confirmation is required
      if (data?.user && !data.session) {
        setMessage('Registration successful! Please check your email to confirm your account.')
      } else if (data?.session) {
        // Auto-signed in (if email confirmation is disabled)
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(handleAuthError(err))
    } finally {
      setLoading(false)
    }
  }
  
  const getTenantIcon = () => {
    switch (tenant?.subdomain) {
      case 'siga':
        return <MapPin className="h-8 w-8" />
      case 'fema':
        return <Zap className="h-8 w-8" />
      default:
        return <Building2 className="h-8 w-8" />
    }
  }
  
  const PasswordStrengthIndicator = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className="text-xs font-medium">
          {passwordStrength.score === 0 && 'No password'}
          {passwordStrength.score > 0 && passwordStrength.score <= 25 && 'Weak'}
          {passwordStrength.score > 25 && passwordStrength.score <= 50 && 'Fair'}
          {passwordStrength.score > 50 && passwordStrength.score <= 75 && 'Good'}
          {passwordStrength.score > 75 && 'Strong'}
        </span>
      </div>
      <Progress value={passwordStrength.score} className="h-2" />
      {passwordStrength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {passwordStrength.feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <X className="h-3 w-3 text-red-500" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {passwordStrength.score === 100 && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Strong password
        </div>
      )}
    </div>
  )
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: theme ? `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      <Card className="w-full max-w-md relative z-10 border-white/20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div 
              className="p-3 rounded-full"
              style={{ 
                background: theme ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` : 'linear-gradient(135deg, #667eea, #764ba2)'
              }}
            >
              {getTenantIcon()}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Join {tenant?.name || 'Initiative Dashboard'}
          </CardTitle>
          <CardDescription>
            Create your account to get started with OKR management
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              {password && <PasswordStrengthIndicator />}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                disabled={loading}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I accept the terms and conditions
                </Label>
                <p className="text-xs text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="underline">Terms of Service</Link> and{' '}
                  <Link href="/privacy" className="underline">Privacy Policy</Link>
                </p>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || !acceptTerms}
              style={{
                background: theme ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` : undefined
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter>
          <div className="text-sm text-center w-full text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}