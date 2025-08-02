'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, AlertCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StratixInsight } from '@/lib/stratix/api-client'

interface InsightsSectionProps {
  insights: StratixInsight[]
  isLoading: boolean
}

export function InsightsSection({ insights, isLoading }: InsightsSectionProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />
      case 'risk':
        return <AlertCircle className="h-4 w-4" />
      case 'recommendation':
        return <Sparkles className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card className="glassmorphic-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Insights y Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-pulse">
              <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-white/20 rounded w-1/2"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glassmorphic-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Insights y Recomendaciones
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">
              No hay insights disponibles en este momento.
            </p>
          </div>
        ) : (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} getTypeIcon={getTypeIcon} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface InsightCardProps {
  insight: StratixInsight
  getTypeIcon: (type: string) => React.ReactNode
}

function InsightCard({ insight, getTypeIcon }: InsightCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start space-x-3">
        <div className={cn(
          "p-2 rounded-lg",
          insight.type === 'opportunity' ? 'bg-green-500/20 text-green-400' :
          insight.type === 'risk' ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        )}>
          {getTypeIcon(insight.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-white">{insight.title}</h3>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              insight.impact === 'high' ? 'bg-red-500/20 text-red-400' :
              insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            )}>
              {insight.impact}
            </span>
          </div>
          <p className="text-sm text-white/70 mb-3">{insight.description}</p>
          
          {insight.metrics && insight.metrics.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-white/60 mb-1">Métricas:</h4>
              <div className="flex flex-wrap gap-1">
                {insight.metrics.map((metric, index) => (
                  <span key={index} className="text-xs bg-white/10 px-2 py-1 rounded text-white/80">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.affectedAreas && insight.affectedAreas.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-white/60 mb-1">Áreas afectadas:</h4>
              <div className="flex flex-wrap gap-1">
                {insight.affectedAreas.map((area, index) => (
                  <span key={index} className="text-xs bg-primary/20 px-2 py-1 rounded text-primary-foreground">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-white/60 mb-2">Acciones sugeridas:</h4>
              <ul className="text-xs text-white/70 space-y-1">
                {insight.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}