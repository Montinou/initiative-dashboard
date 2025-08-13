"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FilterErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class FilterErrorBoundary extends React.Component<
  { 
    children: React.ReactNode
    fallback?: React.ReactNode
    onReset?: () => void
  },
  FilterErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode; onReset?: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FilterErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Filter error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="bg-red-500/10 rounded-full p-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-sm text-red-400 text-center mb-3">
            Filter failed to load
          </p>
          <Button
            onClick={this.handleReset}
            size="sm"
            variant="outline"
            className="text-red-400 border-red-400/50 hover:bg-red-500/10"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-3 p-2 bg-gray-900/50 rounded text-xs">
              <summary className="cursor-pointer text-gray-400">Error details</summary>
              <pre className="mt-1 text-red-400 overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Functional error boundary wrapper for simpler usage
export function withFilterErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <FilterErrorBoundary fallback={fallback}>
        <Component {...props} />
      </FilterErrorBoundary>
    )
  }
}