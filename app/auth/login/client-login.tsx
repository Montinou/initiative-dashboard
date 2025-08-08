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

export function ClientLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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

      setSuccess('¡Inicio de sesión exitoso! Redirigiendo...')
      
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
        setError('La operación tardó demasiado tiempo. Por favor, verifica tu conexión a internet e intenta de nuevo.')
      } else {
        const errorMessage = getAuthErrorMessage(err)
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            {success}
            <Loader2 className="h-4 w-4 animate-spin" />
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-white font-medium">
          Correo Electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-white font-medium">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
  )
}