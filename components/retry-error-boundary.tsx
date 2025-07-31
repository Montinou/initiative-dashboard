"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RetryErrorProps {
  error: Error | string
  onRetry: () => void | Promise<void>
  maxRetries?: number
  retryDelay?: number
  className?: string
}

export function RetryError({ 
  error, 
  onRetry, 
  maxRetries = 3,
  retryDelay = 1000,
  className 
}: RetryErrorProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorType = getErrorType(errorMessage)
  const { icon: Icon, title, description, color } = getErrorDetails(errorType)
  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && isRetrying) {
      handleRetry()
    }
  }, [countdown, isRetrying])
  
  const handleRetry = async () => {
    if (retryCount >= maxRetries) {
      setIsRetrying(false)
      return
    }
    
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    
    try {
      await onRetry()
      // If successful, component will likely unmount
    } catch (err) {
      // Exponential backoff
      const delay = Math.min(retryDelay * Math.pow(2, retryCount), 10000)
      setCountdown(Math.ceil(delay / 1000))
    }
  }
  
  const startRetry = () => {
    setCountdown(3) // 3 second countdown
    setIsRetrying(true)
  }
  
  const canRetry = retryCount < maxRetries && !isRetrying
  
  return (
    <Card className={cn("glassmorphic-card border-red-500/20", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            color === 'red' && "bg-red-500/20",
            color === 'yellow' && "bg-yellow-500/20",
            color === 'blue' && "bg-blue-500/20"
          )}>
            <Icon className={cn(
              "h-6 w-6",
              color === 'red' && "text-red-400",
              color === 'yellow' && "text-yellow-400",
              color === 'blue' && "text-blue-400"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-white/60 text-sm mb-3">{description}</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-3">
                <summary className="cursor-pointer text-white/60 text-sm hover:text-white/80">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-white/50 bg-black/20 p-3 rounded overflow-auto max-h-32">
                  {errorMessage}
                </pre>
              </details>
            )}
            
            {isRetrying && countdown > 0 && (
              <div className="mb-3">
                <p className="text-sm text-white/60 mb-1">
                  Retrying in {countdown} seconds... (Attempt {retryCount}/{maxRetries})
                </p>
                <Progress value={(3 - countdown) * 33.33} className="h-1" />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {canRetry ? (
                <Button
                  size="sm"
                  onClick={startRetry}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              ) : !isRetrying && (
                <p className="text-sm text-red-400">
                  Maximum retry attempts reached
                </p>
              )}
              
              {isRetrying && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsRetrying(false)
                    setCountdown(0)
                  }}
                  className="border-white/20"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type ErrorType = 'network' | 'auth' | 'server' | 'unknown'

function getErrorType(message: string): ErrorType {
  const lowerMessage = message.toLowerCase()
  
  if (
    lowerMessage.includes('network') || 
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection')
  ) {
    return 'network'
  }
  
  if (
    lowerMessage.includes('auth') || 
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('permission')
  ) {
    return 'auth'
  }
  
  if (
    lowerMessage.includes('server') || 
    lowerMessage.includes('500') ||
    lowerMessage.includes('database')
  ) {
    return 'server'
  }
  
  return 'unknown'
}

function getErrorDetails(type: ErrorType) {
  switch (type) {
    case 'network':
      return {
        icon: WifiOff,
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        color: 'yellow' as const
      }
    case 'auth':
      return {
        icon: Lock,
        title: 'Authentication Error',
        description: 'You need to be logged in to access this resource.',
        color: 'red' as const
      }
    case 'server':
      return {
        icon: ServerCrash,
        title: 'Server Error',
        description: 'The server encountered an error. Our team has been notified.',
        color: 'red' as const
      }
    default:
      return {
        icon: AlertTriangle,
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        color: 'blue' as const
      }
  }
}