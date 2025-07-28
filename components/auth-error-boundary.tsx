'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface AuthErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class AuthErrorBoundary extends React.Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    // You can log the error to an error reporting service here
    if (typeof window !== 'undefined') {
      // Only log in browser environment
      console.group('🔐 Authentication Error Details')
      console.error('Error:', error.message)
      console.error('Stack:', error.stack)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <AuthErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function AuthErrorFallback({ error }: { error?: Error }) {
  const handleRetry = () => {
    window.location.reload()
  }

  const isAuthError = error?.message?.toLowerCase().includes('auth') || 
                     error?.message?.toLowerCase().includes('session') ||
                     error?.message?.toLowerCase().includes('token')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-white">
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-white/70">
            {isAuthError 
              ? 'There was a problem with your authentication. Please try signing in again.'
              : 'An unexpected error occurred. Please try refreshing the page.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
              <p className="text-red-300 text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Link href={isAuthError ? '/auth/login' : '/dashboard'}>
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Home className="h-4 w-4 mr-2" />
                {isAuthError ? 'Go to Login' : 'Go to Dashboard'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for handling auth errors in components
export function useAuthErrorHandler() {
  const handleAuthError = (error: any) => {
    console.error('Authentication error:', error)
    
    // Check if it's a session/auth related error
    const isAuthError = error?.message?.toLowerCase().includes('auth') || 
                       error?.message?.toLowerCase().includes('session') ||
                       error?.message?.toLowerCase().includes('token') ||
                       error?.status === 401

    if (isAuthError) {
      // Redirect to login
      window.location.href = '/auth/login?error=Session expired'
    } else {
      // Log the error for debugging
      throw error
    }
  }

  return { handleAuthError }
}