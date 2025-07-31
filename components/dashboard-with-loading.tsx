"use client"

import { useInitiativesSummaryV2 } from "@/hooks/useInitiativesSummaryV2"
import { useFilters } from "@/hooks/useFilters"
import { FilterContainer } from "@/components/filters/FilterContainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  InitiativeCardSkeleton, 
  MetricCardSkeleton,
  ChartSkeleton,
  DashboardSkeleton 
} from "@/components/ui/skeleton-loaders"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [value, duration])
  
  return <span>{count}</span>
}

export function DashboardWithLoading() {
  const { filters, updateFilter, resetFilters } = useFilters()
  const { 
    initiatives, 
    loading, 
    error, 
    summary, 
    shouldShowSkeleton,
    shouldShowOverlay,
    isInitialLoad 
  } = useInitiativesSummaryV2(filters)
  
  // Show full skeleton on initial load
  if (shouldShowSkeleton) {
    return <DashboardSkeleton />
  }
  
  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen p-6">
        <Card className="glassmorphic-card border-red-500/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Dashboard</h3>
            <p className="text-white/60 text-center mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen p-6 relative">
      {/* Loading overlay for subsequent loads */}
      <AnimatePresence>
        {shouldShowOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <div className="glassmorphic-card p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-white/70">Updating dashboard...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-white/60">Track your initiatives and progress</p>
      </div>
      
      {/* Filters */}
      <FilterContainer 
        filters={filters} 
        onFilterChange={updateFilter} 
        onReset={resetFilters} 
      />
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glassmorphic-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Total Initiatives</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={summary.total} />
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glassmorphic-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">In Progress</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={summary.byStatus.in_progress} />
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glassmorphic-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={summary.byStatus.completed} />
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glassmorphic-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Avg Progress</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={Math.round(summary.averageProgress)} />%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Initiative Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Recent Initiatives</h2>
        
        <AnimatePresence mode="popLayout">
          {initiatives.slice(0, 6).map((initiative, index) => (
            <motion.div
              key={initiative.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glassmorphic-card hover:border-purple-500/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {initiative.title}
                      </h3>
                      <p className="text-white/60 text-sm line-clamp-2">
                        {initiative.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "ml-4",
                        initiative.priority === 'high' && "border-red-500/50 text-red-400",
                        initiative.priority === 'medium' && "border-yellow-500/50 text-yellow-400",
                        initiative.priority === 'low' && "border-green-500/50 text-green-400"
                      )}
                    >
                      {initiative.priority}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white font-medium">
                        {initiative.initiative_progress}%
                      </span>
                    </div>
                    <Progress 
                      value={initiative.initiative_progress} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        {initiative.areas && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {initiative.areas.name}
                          </span>
                        )}
                        <Badge variant="secondary">
                          {initiative.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {initiative.target_date && (
                        <span className="text-sm text-white/60">
                          Due: {new Date(initiative.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {initiatives.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="glassmorphic-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-white/30 mb-4" />
                <p className="text-white/60">No initiatives found</p>
                <p className="text-white/40 text-sm mt-1">Try adjusting your filters</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from "react"