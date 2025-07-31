"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassmorphicSkeleton, DashboardSkeleton } from '@/components/ui/skeleton-loaders'
import { LoadingTransition } from '@/components/ui/smooth-transitions'
import { RetryError } from '@/components/retry-error-boundary'
import { useLoadingState } from '@/lib/loading-context'

export function LoadingDemo() {
  const [data, setData] = useState<any[]>([])
  const [hasData, setHasData] = useState(false)
  const { isLoading, error, startLoading, stopLoading, setError } = useLoadingState('demo')
  
  const loadData = async () => {
    startLoading('Loading demo data...')
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate random success/failure
      if (Math.random() > 0.7) {
        throw new Error('Network error: Failed to fetch data')
      }
      
      const mockData = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
        description: `This is a demo item with ID ${i + 1}`,
        status: Math.random() > 0.5 ? 'active' : 'inactive'
      }))
      
      setData(mockData)
      setHasData(true)
      stopLoading()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
    }
  }
  
  // Initial load
  useEffect(() => {
    if (!hasData) {
      loadData()
    }
  }, [hasData])
  
  if (isLoading && !hasData) {
    return <DashboardSkeleton />
  }
  
  if (error && !hasData) {
    return (
      <div className="p-6">
        <RetryError
          error={error}
          onRetry={loadData}
          maxRetries={3}
        />
      </div>
    )
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Loading System Demo</h1>
        <Button 
          onClick={loadData}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isLoading ? 'Loading...' : 'Reload Data'}
        </Button>
      </div>
      
      <LoadingTransition
        isLoading={isLoading}
        loadingContent={
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70">Updating data...</p>
          </div>
        }
        showLoadingOverlay={hasData}
      >
        <div className="grid gap-4">
          {data.map((item) => (
            <Card key={item.id} className="glassmorphic-card">
              <CardHeader>
                <CardTitle className="text-white">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 mb-2">{item.description}</p>
                <span className={`px-2 py-1 rounded text-sm ${
                  item.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {item.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </LoadingTransition>
      
      {error && hasData && (
        <div className="mt-4">
          <RetryError
            error={error}
            onRetry={loadData}
            maxRetries={3}
            className="border-yellow-500/20"
          />
        </div>
      )}
    </div>
  )
}