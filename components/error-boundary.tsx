"use client"

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; reset: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })
  }
  
  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} reset={this.reset} />
      }
      
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />
    }
    
    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="glassmorphic-card max-w-lg w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            
            <p className="text-white/60 mb-6">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="w-full mb-6 text-left">
                <summary className="cursor-pointer text-white/80 hover:text-white mb-2">
                  Error details
                </summary>
                <pre className="text-xs text-white/60 bg-black/20 p-4 rounded-lg overflow-auto max-h-48">
                  {error.stack || error.message}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={reset}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                asChild
                className="border-white/20 hover:bg-white/10"
              >
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook to use error boundary imperatively
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)
  
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])
  
  const resetError = () => setError(null)
  const throwError = (error: Error) => setError(error)
  
  return { throwError, resetError }
}