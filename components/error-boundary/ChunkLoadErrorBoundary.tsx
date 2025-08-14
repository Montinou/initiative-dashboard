'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
  isChunkLoadError: boolean
  isNetworkError: boolean
}

class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
      isNetworkError: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkLoadError = error.name === 'ChunkLoadError' || 
                            error.message.includes('Loading chunk') ||
                            error.message.includes('Failed to fetch')
    
    // Check if it's a network error
    const isNetworkError = error.message.includes('ERR_NETWORK_CHANGED') ||
                          error.message.includes('Network request failed') ||
                          error.message.includes('Failed to fetch')

    return {
      hasError: true,
      error,
      errorInfo: null,
      isChunkLoadError,
      isNetworkError
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ChunkLoadErrorBoundary caught an error:', error, errorInfo)
    
    // Log to monitoring service if available
    if (typeof window !== 'undefined' && window.console) {
      console.error('[ChunkLoadErrorBoundary] Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    }

    this.setState({
      errorInfo
    })
  }

  handleReload = () => {
    // Clear the error state first
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
      isNetworkError: false
    })

    // Force reload the page to fetch fresh chunks
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleSoftReload = () => {
    // Try to recover without full page reload
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkLoadError: false,
      isNetworkError: false
    })
  }

  render() {
    if (this.state.hasError) {
      const { isChunkLoadError, isNetworkError, error } = this.state

      // Chunk loading or network error - show friendly recovery UI
      if (isChunkLoadError || isNetworkError) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                  {isNetworkError ? (
                    <WifiOff className="h-6 w-6 text-destructive" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <CardTitle>
                  {isNetworkError ? 'Connection Issue' : 'Loading Error'}
                </CardTitle>
                <CardDescription>
                  {isNetworkError 
                    ? 'Your network connection was interrupted. Please check your connection and try again.'
                    : 'Some resources failed to load. This usually happens due to a network issue or an outdated version.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={this.handleReload}
                    className="w-full"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button 
                    onClick={this.handleSoftReload}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again Without Reload
                  </Button>
                </div>
                
                {process.env.NODE_ENV === 'development' && error && (
                  <details className="mt-4">
                    <summary className="text-sm text-muted-foreground cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {error.message}
                      {error.stack}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        )
      }

      // Other errors - show generic error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={this.handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {error?.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChunkLoadErrorBoundary