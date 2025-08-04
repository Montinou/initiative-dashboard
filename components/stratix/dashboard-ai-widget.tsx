'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Bot, 
  TrendingUp, 
  AlertTriangle,
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardAI, type DashboardView, type DashboardAIEnhancement } from '@/lib/stratix/dashboard-ai-integration'
import { useKPIIntegration } from '@/lib/stratix/kpi-integration'
import { useStratixAssistant } from '@/hooks/useStratixAssistant'
import type { CompanyContext } from '@/lib/stratix/data-service'
import type { UserRole } from '@/lib/stratix/role-based-ai'
import { useAuth } from '@/lib/auth-context'
import { useUserProfile } from '@/hooks/useUserProfile'

interface DashboardAIWidgetProps {
  view: DashboardView
  userRole: UserRole
  companyContext: CompanyContext | null
  className?: string
  position?: 'sidebar' | 'top' | 'bottom' | 'floating'
  minimized?: boolean
  onMinimize?: (minimized: boolean) => void
}

export function DashboardAIWidget({
  view,
  userRole,
  companyContext,
  className,
  position = 'sidebar',
  minimized = false,
  onMinimize
}: DashboardAIWidgetProps) {
  const { session } = useAuth()
  const { userProfile } = useUserProfile()
  const userId = session?.user?.id || ''
  
  // Enhanced AI capabilities
  const { generateInsights, getKPIForAI } = useStratixAssistant()
  const kpiIntegration = useKPIIntegration()
  
  const [enhancement, setEnhancement] = useState<DashboardAIEnhancement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['insights']))
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [quickInsights, setQuickInsights] = useState<any[]>([])

  // Enhanced KPI-powered AI insights loading
  const loadEnhancedKPIInsights = useCallback(async () => {
    if (!userProfile?.tenant_id || !kpiIntegration.isReady) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🚀 Loading enhanced KPI-powered AI insights for:', view)
      
      // Get AI-optimized KPI data
      const kpiData = await kpiIntegration.getAIKPIData('current')
      
      // Generate intelligent insights
      const aiInsights = await generateInsights(kpiData)
      
      // Transform into dashboard enhancement format
      const enhancement: DashboardAIEnhancement = {
        view,
        generatedAt: new Date().toISOString(),
        alerts: aiInsights
          .filter(insight => insight.priority === 'urgent' || insight.priority === 'high')
          .map(insight => ({
            id: insight.title.replace(/\s+/g, '-').toLowerCase(),
            type: insight.type === 'risk' ? 'warning' : 'info',
            title: insight.title,
            description: insight.description,
            priority: insight.priority,
            actionRequired: insight.priority === 'urgent',
            dismissible: true
          })),
        insights: aiInsights.map(insight => ({
          title: insight.title,
          description: insight.description,
          impact: insight.priority === 'urgent' ? 'high' : insight.priority,
          type: insight.type,
          metrics: [insight.potential_impact],
          affectedAreas: insight.affected_areas
        })),
        predictions: [], // KPI-based predictions will be available when KPI data service is connected
        smartActions: aiInsights
          .filter(insight => insight.suggested_actions.length > 0)
          .map(insight => ({
            id: insight.title.replace(/\s+/g, '-').toLowerCase(),
            title: `Resolver: ${insight.title}`,
            description: insight.suggested_actions[0],
            difficulty: insight.timeframe === 'immediate' ? 'Fácil' : 'Moderado',
            timeRequired: insight.timeframe === 'immediate' ? '5 min' : '30 min',
            category: 'optimization'
          })),
        recommendations: aiInsights
          .flatMap(insight => insight.suggested_actions)
          .slice(0, 5)
      }

      setEnhancement(enhancement)
      setQuickInsights(aiInsights.slice(0, 3))
      console.log('✅ Enhanced KPI insights loaded successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load enhanced KPI insights'
      setError(errorMessage)
      console.error('❌ Error loading enhanced KPI insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [view, userProfile?.tenant_id, kpiIntegration.isReady, generateInsights, kpiIntegration])

  // Legacy AI enhancements (fallback)
  const loadAIEnhancements = useCallback(async () => {
    if (!companyContext || !userId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🤖 Loading AI enhancements for dashboard view:', view)
      
      let enhancement: DashboardAIEnhancement
      
      switch (view) {
        case 'overview':
          enhancement = await dashboardAI.enhanceOverviewDashboard(userId, userRole, companyContext)
          break
        case 'initiatives':
          enhancement = await dashboardAI.enhanceInitiativesDashboard(userId, userRole, companyContext)
          break
        case 'areas':
          enhancement = await dashboardAI.enhanceAreasDashboard(userId, userRole, companyContext)
          break
        case 'analytics':
          enhancement = await dashboardAI.enhanceAnalyticsDashboard(userId, userRole, companyContext)
          break
        default:
          throw new Error(`Unsupported dashboard view: ${view}`)
      }

      setEnhancement(enhancement)
      console.log('✅ AI enhancements loaded successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load AI enhancements'
      setError(errorMessage)
      console.error('❌ Error loading AI enhancements:', err)
    } finally {
      setIsLoading(false)
    }
  }, [view, userRole, companyContext, userId])

  // Main load function - prioritizes enhanced KPI insights
  const loadInsights = useCallback(async () => {
    if (kpiIntegration.isReady && userProfile?.tenant_id) {
      await loadEnhancedKPIInsights()
    } else {
      await loadAIEnhancements()
    }
  }, [loadEnhancedKPIInsights, loadAIEnhancements, kpiIntegration.isReady, userProfile?.tenant_id])

  // Manual AI enhancement loading - removed automatic loading
  // Users must explicitly trigger AI analysis by clicking the refresh button
  // useEffect(() => {
  //   loadAIEnhancements()
  // }, [loadAIEnhancements])

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }, [])

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId))
  }, [])

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      default:
        return <Info className="h-4 w-4 text-blue-400" />
    }
  }

  // Get prediction impact icon
  const getPredictionIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      default:
        return <Target className="h-4 w-4 text-blue-400" />
    }
  }

  // Filter visible alerts
  const visibleAlerts = enhancement?.alerts.filter(alert => !dismissedAlerts.has(alert.id)) || []

  if (minimized) {
    return (
      <Card className={cn(
        "bg-slate-800/50 backdrop-blur-xl border-white/10 transition-all duration-300",
        position === 'floating' && "fixed bottom-4 right-4 z-50",
        className
      )}>
        <CardContent className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMinimize?.(false)}
            className="w-full flex items-center justify-center text-white/70 hover:text-white"
          >
            <Bot className="h-4 w-4 mr-2" />
            AI Insights
            {visibleAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {visibleAlerts.length}
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "bg-slate-800/50 backdrop-blur-xl border-white/10 transition-all duration-300",
      position === 'floating' && "fixed bottom-4 right-4 z-50 w-96",
      position === 'sidebar' && "w-full",
      className
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            AI Insights - {view.charAt(0).toUpperCase() + view.slice(1)}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadInsights}
              disabled={isLoading}
              className="text-white/70 hover:text-white"
              title={kpiIntegration.isReady ? "Generar insights con IA avanzada" : "Generar insights básicos"}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {kpiIntegration.isReady && <Zap className="h-3 w-3 ml-1 text-yellow-400" />}
                </>
              )}
            </Button>
            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMinimize(true)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-white/70">Generando insights de IA...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-400 mr-2" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {enhancement && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Alerts Section */}
              {visibleAlerts.length > 0 && (
                <Collapsible open={expandedSections.has('alerts')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('alerts')}
                    className="flex items-center justify-between w-full p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center text-white font-medium">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Alertas ({visibleAlerts.length})
                    </div>
                    {expandedSections.has('alerts') ? (
                      <ChevronUp className="h-4 w-4 text-white/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {visibleAlerts.map((alert) => (
                      <div key={alert.id} className="bg-slate-700/20 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2">
                            {getAlertIcon(alert.type)}
                            <div>
                              <p className="text-white font-medium text-sm">{alert.title}</p>
                              <p className="text-white/70 text-xs">{alert.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {alert.priority} prioridad
                                </Badge>
                                {alert.actionRequired && (
                                  <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                                    Acción requerida
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {alert.dismissible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissAlert(alert.id)}
                              className="text-white/50 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Insights Section */}
              {enhancement.insights.length > 0 && (
                <Collapsible open={expandedSections.has('insights')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('insights')}
                    className="flex items-center justify-between w-full p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center text-white font-medium">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Insights ({enhancement.insights.length})
                    </div>
                    {expandedSections.has('insights') ? (
                      <ChevronUp className="h-4 w-4 text-white/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {enhancement.insights.slice(0, 3).map((insight, index) => (
                      <div key={index} className="bg-slate-700/20 rounded-lg p-3">
                        <p className="text-white font-medium text-sm">{insight.title}</p>
                        <p className="text-white/70 text-xs mt-1">{insight.description}</p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "mt-2 text-xs",
                            insight.impact === 'high' ? 'border-red-500/30 text-red-400' :
                            insight.impact === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                            'border-green-500/30 text-green-400'
                          )}
                        >
                          {insight.impact} impact
                        </Badge>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Predictions Section */}
              {enhancement.predictions.length > 0 && (
                <Collapsible open={expandedSections.has('predictions')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('predictions')}
                    className="flex items-center justify-between w-full p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center text-white font-medium">
                      <Target className="h-4 w-4 mr-2" />
                      Predicciones ({enhancement.predictions.length})
                    </div>
                    {expandedSections.has('predictions') ? (
                      <ChevronUp className="h-4 w-4 text-white/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {enhancement.predictions.map((prediction) => (
                      <div key={prediction.id} className="bg-slate-700/20 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          {getPredictionIcon(prediction.impact)}
                          <div>
                            <p className="text-white font-medium text-sm">{prediction.title}</p>
                            <p className="text-white/70 text-xs mt-1">{prediction.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {prediction.confidence}% confianza
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {prediction.timeline}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Smart Actions Section */}
              {enhancement.smartActions.length > 0 && (
                <Collapsible open={expandedSections.has('smartActions')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('smartActions')}
                    className="flex items-center justify-between w-full p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center text-white font-medium">
                      <Zap className="h-4 w-4 mr-2" />
                      Acciones Inteligentes ({enhancement.smartActions.length})
                    </div>
                    {expandedSections.has('smartActions') ? (
                      <ChevronUp className="h-4 w-4 text-white/60" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/60" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {enhancement.smartActions.map((action) => (
                      <div key={action.id} className="bg-slate-700/20 rounded-lg p-3">
                        <p className="text-white font-medium text-sm">{action.title}</p>
                        <p className="text-white/70 text-xs mt-1">{action.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs">
                              {action.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {action.timeRequired}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs h-6">
                            Implementar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Recommendations */}
              {enhancement.recommendations.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <h4 className="text-blue-400 font-medium text-sm mb-2">Recomendaciones de IA</h4>
                  <ul className="text-blue-300/80 text-xs space-y-1">
                    {enhancement.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {!enhancement && !isLoading && !error && (
          <div className="text-center py-4">
            <Bot className="h-8 w-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/60 text-sm">No hay insights de IA disponibles</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInsights}
              className="mt-2"
            >
              {kpiIntegration.isReady ? (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Generar Insights Avanzados
                </>
              ) : (
                'Generar Insights'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}