'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Mail, Lock, AlertCircle, Building2, MapPin, Zap, Loader2, Check, X, ArrowLeft } from 'lucide-react'
import { isAuthApiError } from '@supabase/supabase-js'
import { getTenantFromId } from '@/lib/auth/tenant-detection'

type Mode = 'request' | 'reset'

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [mode, setMode] = useState<Mode>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
  
  // Check for token in URL (for reset mode)
  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    if (token && type === 'recovery') {
      setMode('reset')
    }
    
    // Set default tenant
    const setDefaultTenant = async () => {
      // Use default SIGA tenant
      const tenantInfo = getTenantFromId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      setTenant(tenantInfo)
      setTheme(null) // Theme is handled by CSS now
    }
    
    setDefaultTenant()
  }, [searchParams])
  
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
      case 'over_email_send_rate_limit':
        return 'Too many attempts. Please wait before trying again'
      case 'user_not_found':
        return 'No account found with this email address'
      case 'same_password':
        return 'New password must be different from your current password'
      case 'weak_password':
        return 'Password is too weak. Please choose a stronger password'
      default:
        return error.message || 'Password reset failed'
    }
  }
  
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
      
      setMessage('Password reset link sent! Check your email to continue.')
    } catch (err: any) {
      setError(handleAuthError(err))
    } finally {
      setLoading(false)
    }
  }
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (passwordStrength.score < 50) {
      setError('Please choose a stronger password')
      return
    }
    
    setLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setMessage('Password updated successfully! Redirecting to login...')
      
      // Sign out to ensure clean state
      await supabase.auth.signOut()
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login?reset=success')
      }, 2000)
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      <Card className="w-full max-w-md relative z-10 border-white/20 bg-background/90 backdrop-blur-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary/80">
              {getTenantIcon()}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'request' ? 'Reset Your Password' : 'Create New Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'request' 
              ? 'Enter your email and we\'ll send you a reset link'
              : 'Choose a strong new password for your account'
            }
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
              <Check className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {mode === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
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
                <p className="text-xs text-muted-foreground">
                  We'll send a password reset link to this email address
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
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
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || password !== confirmPassword || passwordStrength.score < 50}
                style={{
                  background: theme ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` : undefined
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter>
          <Link 
            href="/auth/login" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 w-full justify-center"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}