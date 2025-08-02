"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="bg-red-500/10 backdrop-blur-sm rounded-full p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-center max-w-md mb-4">
            We encountered an error while loading this page. Please try refreshing or contact support if the problem persists.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            Refresh Page
          </Button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-4 p-4 bg-gray-900/50 rounded-lg max-w-2xl w-full">
              <summary className="text-sm text-gray-400 cursor-pointer">Error details</summary>
              <pre className="mt-2 text-xs text-red-400 overflow-auto">
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