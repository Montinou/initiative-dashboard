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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Insights y Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-muted rounded w-1/2"></div>
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
            <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
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
    <div className="bg-card rounded-lg p-4 border border-border hover:border-accent transition-colors">
      <div className="flex items-start space-x-3">
        <div className={cn(
          "p-2 rounded-lg",
          insight.type === 'opportunity' ? 'bg-primary/20 text-primary' :
          insight.type === 'risk' ? 'bg-destructive/20 text-destructive' :
          'bg-primary/20 text-primary'
        )}>
          {getTypeIcon(insight.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-foreground">{insight.title}</h3>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              insight.impact === 'high' ? 'bg-destructive/20 text-destructive' :
              insight.impact === 'medium' ? 'bg-warning/20 text-warning' :
              'bg-primary/20 text-primary'
            )}>
              {insight.impact}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
          
          {insight.metrics && insight.metrics.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Métricas:</h4>
              <div className="flex flex-wrap gap-1">
                {insight.metrics.map((metric, index) => (
                  <span key={index} className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          )}

          {insight.affectedAreas && insight.affectedAreas.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Áreas afectadas:</h4>
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
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Acciones sugeridas:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
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