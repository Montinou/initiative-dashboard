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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>
            {isAuthError ? 'Authentication Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isAuthError 
              ? 'There was a problem with your authentication. Please try signing in again.'
              : 'An unexpected error occurred. Please try refreshing the page.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-destructive text-sm font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleRetry}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Link href={isAuthError ? '/auth/login' : '/dashboard'}>
              <Button 
                variant="outline" 
                className="w-full"
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