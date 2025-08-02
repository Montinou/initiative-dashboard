'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

export class StratixErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Stratix Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error handler
    this.props.onError?.(error, errorInfo)

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
      console.error('Production error in Stratix Assistant:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`🔄 Retrying Stratix component (${this.state.retryCount + 1}/${this.maxRetries})`)
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      console.warn('⚠️ Maximum retry attempts reached for Stratix component')
    }
  }

  handleReset = () => {
    console.log('🔄 Resetting Stratix error boundary')
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="glassmorphic-card border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error en Asistente Stratix
              <Badge 
                variant="outline" 
                className="ml-2 border-red-500/50 text-red-400 bg-red-500/10"
              >
                Sistema Inteligente
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-white/90 text-sm">
                El Asistente Stratix ha encontrado un problema técnico. Este error ha sido registrado 
                automáticamente para su resolución.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                    Detalles técnicos (desarrollo)
                  </summary>
                  <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono text-white/70">
                    <div className="mb-1">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-1">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {this.state.retryCount < this.maxRetries ? (
                <Button 
                  onClick={this.handleRetry}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar ({this.maxRetries - this.state.retryCount} intentos restantes)
                </Button>
              ) : (
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                  size="sm"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Reiniciar Asistente
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.reload()}
                variant="ghost"
                className="text-white/60 hover:text-white/80"
                size="sm"
              >
                Recargar Página
              </Button>
            </div>

            <div className="pt-3 border-t border-white/10">
              <h4 className="text-sm font-medium text-white/80 mb-2">
                Alternativas disponibles:
              </h4>
              <ul className="text-xs text-white/60 space-y-1">
                <li>• Utilizar las métricas y análisis mostrados en el dashboard principal</li>
                <li>• Revisar los KPIs y reportes sin funcionalidad de chat</li>
                <li>• Contactar al soporte técnico si el problema persiste</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withStratixErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <StratixErrorBoundary fallback={fallback}>
      <Component {...props} />
    </StratixErrorBoundary>
  )

  WrappedComponent.displayName = `withStratixErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized error boundary for the chat component
export function StratixChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <StratixErrorBoundary
      fallback={
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-white/90 mb-1">
            Chat temporalmente no disponible
          </h3>
          <p className="text-xs text-white/60">
            El servicio de chat está experimentando problemas. 
            Los demás análisis siguen funcionando normalmente.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reiniciar chat
          </Button>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('🚨 Stratix Chat Error:', error)
        
        // Log chat-specific errors
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to monitoring service
          console.error('Chat error details:', {
            error: error.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }
      }}
    >
      {children}
    </StratixErrorBoundary>
  )
}