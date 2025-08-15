'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange code for session
        const code = searchParams.get('code')
        
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            router.push('/auth/login?error=callback_failed')
            return
          }
        }
        
        // Verify we have a valid user (following supabase-sesion.md - ALWAYS use getUser on server)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('No user after callback:', userError)
          router.push('/auth/login?error=no_session')
          return
        }
        
        // Success - redirect to intended destination
        console.log('Auth callback successful, redirecting to:', redirectTo)
        router.push(redirectTo)
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/auth/login?error=unexpected')
      }
    }
    
    handleCallback()
  }, [searchParams, router, supabase, redirectTo])
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-muted-foreground">
            Completing sign in...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}