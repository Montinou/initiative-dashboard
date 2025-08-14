"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class TDZErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a TDZ error
    const isTDZError = 
      error.message?.includes('Cannot access') && 
      error.message?.includes('before initialization')

    if (isTDZError) {
      console.error('TDZ Error detected:', error.message)
      // Log additional debugging information
      console.trace('TDZ Error stack trace')
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isTDZError = 
      error.message?.includes('Cannot access') && 
      error.message?.includes('before initialization')

    if (isTDZError) {
      // Report TDZ error to monitoring service
      console.error('TDZ Error caught by boundary:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      })

      // Try to recover by forcing a page reload in severe cases
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          console.warn('Attempting page reload due to TDZ error')
          window.location.reload()
        }, 1000)
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when children change
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined })
    }
  }

  render() {
    if (this.state.hasError) {
      const isTDZError = 
        this.state.error?.message?.includes('Cannot access') && 
        this.state.error?.message?.includes('before initialization')

      if (isTDZError) {
        return this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.25 18.5c.77.833 1.732 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">Loading Error</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                A temporary loading error occurred. The page will refresh automatically.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )
      }
    }

    return this.props.children
  }
}

export default TDZErrorBoundary