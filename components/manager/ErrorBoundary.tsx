'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'widget';
  retryable?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    this.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
      retryCount: this.state.retryCount
    };

    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    console.error('Error Boundary Caught Error:', errorReport);
    
    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorBoundaryLogs') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('errorBoundaryLogs', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch {
      // Ignore localStorage errors
    }
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleGoHome = () => {
    window.location.href = '/manager-dashboard';
  };

  private renderErrorUI() {
    const { level = 'component', retryable = true } = this.props;
    const { error, retryCount } = this.state;

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const errorSeverity = this.getErrorSeverity(error);
    const canRetry = retryable && retryCount < 3;

    return (
      <div className="flex items-center justify-center min-h-[200px] p-4">
        <Card className="w-full max-w-md mx-auto backdrop-blur-lg bg-white/10 border-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              {errorSeverity === 'critical' ? (
                <AlertTriangle className="h-12 w-12 text-red-400" />
              ) : (
                <AlertCircle className="h-12 w-12 text-yellow-400" />
              )}
            </div>
            <CardTitle className="text-white">
              {level === 'page' ? 'Page Error' : 'Component Error'}
            </CardTitle>
            <CardDescription className="text-white/70">
              {this.getErrorMessage(error, level)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant={errorSeverity === 'critical' ? 'destructive' : 'secondary'}>
                {errorSeverity.toUpperCase()}
              </Badge>
              {retryCount > 0 && (
                <Badge variant="outline" className="text-white border-white/30">
                  Retry #{retryCount}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              {level === 'page' && (
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 p-3 bg-black/20 rounded border border-white/10">
                <summary className="text-sm text-white/70 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-300 whitespace-pre-wrap break-words">
                  {error.message}
                  {error.stack && (
                    <>
                      {'\n\nStack Trace:\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  private getErrorSeverity(error: Error | null): 'warning' | 'critical' {
    if (!error) return 'warning';
    
    // Network errors are usually recoverable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'warning';
    }
    
    // Authentication errors are critical for managers
    if (error.message.includes('auth') || error.message.includes('permission')) {
      return 'critical';
    }
    
    // Database errors are critical
    if (error.message.includes('database') || error.message.includes('supabase')) {
      return 'critical';
    }
    
    return 'warning';
  }

  private getErrorMessage(error: Error | null, level: string): string {
    if (!error) return 'An unexpected error occurred.';
    
    // User-friendly messages based on error type
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    
    if (error.message.includes('auth') || error.message.includes('permission')) {
      return 'Authentication error. Please refresh the page or contact support.';
    }
    
    if (error.message.includes('database') || error.message.includes('supabase')) {
      return 'Database connection issue. Our team has been notified.';
    }
    
    if (level === 'page') {
      return 'This page encountered an error and cannot be displayed.';
    }
    
    return 'This component encountered an error. You can try refreshing or continue using other parts of the dashboard.';
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context: context || 'Manual Report',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Manual Error Report:', errorReport);
    
    // In production, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorReport });
  };

  return { reportError };
}