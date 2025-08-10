'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Users,
  DollarSign,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { stratixDataService } from '@/lib/stratix/data-service'
import type { StratixKPI, StratixInsight, StratixActionPlan } from '@/lib/stratix/api-client'
import type { CompanyContext } from '@/lib/stratix/data-service'
import type { UserRole } from '@/lib/stratix/role-based-ai'

interface AdvancedInsightsPanelProps {
  userRole: UserRole
  companyContext: CompanyContext | null
  className?: string
}

interface GeneratedInsight {
  id: string
  title: string
  description: string
  type: 'opportunity' | 'risk' | 'optimization' | 'trend' | 'prediction'
  impact: 'high' | 'medium' | 'low'
  confidence: number
  category: 'financial' | 'operational' | 'strategic' | 'competitive' | 'team'
  actionRequired: boolean
  relatedKPIs: string[]
  suggestedActions: string[]
  priority: number
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term'
  generatedAt: Date
}

export function AdvancedInsightsPanel({ userRole, companyContext, className }: AdvancedInsightsPanelProps) {
  const [insights, setInsights] = useState<GeneratedInsight[]>([])
  const [kpis, setKpis] = useState<StratixKPI[]>([])
  const [actionPlans, setActionPlans] = useState<StratixActionPlan[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'financial' | 'operational' | 'strategic' | 'competitive' | 'team'>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Generate advanced insights based on company context
  const generateAdvancedInsights = useCallback(async () => {
    if (!companyContext) return
    setIsGenerating(true)
    try {
      // Internal AI removed; show guidance
      console.warn('AI migrated to Dialogflow. Use /test-ai widget for assistant interactions.')
      setInsights([])
      setKpis([])
      setActionPlans([])
      setLastUpdated(new Date())
    } finally {
      setIsGenerating(false)
    }
  }, [companyContext, userRole])

  // Auto-generate insights when component mounts or context changes
  useEffect(() => {
    if (companyContext && !insights.length) {
      generateAdvancedInsights()
    }
  }, [companyContext, generateAdvancedInsights, insights.length])

  // Filter insights by category
  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === activeCategory)

  // Get insight icon based on type
  const getInsightIcon = (type: string, impact: string) => {
    const iconClass = cn(
      "h-5 w-5",
      impact === 'high' ? 'text-red-400' :
      impact === 'medium' ? 'text-yellow-400' :
      'text-green-400'
    )

    switch (type) {
      case 'opportunity':
        return <TrendingUp className={iconClass} />
      case 'risk':
        return <AlertTriangle className={iconClass} />
      case 'optimization':
        return <Zap className={iconClass} />
      case 'trend':
        return <LineChart className={iconClass} />
      case 'prediction':
        return <Sparkles className={iconClass} />
      default:
        return <Lightbulb className={iconClass} />
    }
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial':
        return <DollarSign className="h-4 w-4" />
      case 'operational':
        return <BarChart3 className="h-4 w-4" />
      case 'strategic':
        return <Target className="h-4 w-4" />
      case 'competitive':
        return <TrendingUp className="h-4 w-4" />
      case 'team':
        return <Users className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-3 w-3 text-green-400" />
      case 'down':
        return <ArrowDown className="h-3 w-3 text-red-400" />
      default:
        return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Brain className="h-6 w-6 mr-2" />
            Insights Avanzados de IA
          </h2>
          <p className="text-white/60 text-sm">
            Análisis inteligente personalizado para tu rol de {userRole}
            {lastUpdated && (
              <span className="ml-2">
                • Actualizado {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        
        <Button
          onClick={generateAdvancedInsights}
          disabled={isGenerating || !companyContext}
          className="bg-primary hover:bg-primary/90"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Generando...' : 'Actualizar Insights'}
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'financial', 'operational', 'strategic', 'competitive', 'team'].map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveCategory(category as any)}
            className="text-white/80 hover:text-white"
          >
            {category !== 'all' && getCategoryIcon(category)}
            <span className={category !== 'all' ? 'ml-2' : ''}>
              {category === 'all' ? 'Todos' : 
               category === 'financial' ? 'Financiero' :
               category === 'operational' ? 'Operacional' :
               category === 'strategic' ? 'Estratégico' :
               category === 'competitive' ? 'Competitivo' :
               'Equipo'}
            </span>
            {category === 'all' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {insights.length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
          <TabsTrigger value="insights" className="text-white">
            <Brain className="h-4 w-4 mr-2" />
            Insights ({filteredInsights.length})
          </TabsTrigger>
          <TabsTrigger value="kpis" className="text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            KPIs ({kpis.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-white">
            <Target className="h-4 w-4 mr-2" />
            Planes ({actionPlans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {isGenerating && (
                <Card className="bg-blue-500/10 border border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
                      <div>
                        <p className="text-blue-400 font-medium">Generando insights avanzados...</p>
                        <p className="text-blue-400/70 text-sm">Analizando patrones y tendencias empresariales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredInsights.map((insight) => (
                <Card key={insight.id} className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getInsightIcon(insight.type, insight.impact)}
                        <div>
                          <CardTitle className="text-white text-lg">{insight.title}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                insight.impact === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-green-500/20 text-green-400 border-green-500/30'
                              )}
                            >
                              {insight.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryIcon(insight.category)}
                              <span className="ml-1">{insight.category}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {insight.confidence}% confianza
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {insight.actionRequired && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          Acción Requerida
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-white/80">{insight.description}</p>
                    
                    {insight.relatedKPIs.length > 0 && (
                      <div>
                        <h4 className="text-white/70 font-medium mb-2">KPIs Relacionados:</h4>
                        <div className="flex flex-wrap gap-1">
                          {insight.relatedKPIs.map((kpi, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {insight.suggestedActions.length > 0 && (
                      <div>
                        <h4 className="text-white/70 font-medium mb-2">Acciones Sugeridas:</h4>
                        <ul className="text-white/60 text-sm space-y-1">
                          {insight.suggestedActions.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary mr-2">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>Prioridad: {insight.priority}</span>
                      <span>Timeframe: {insight.timeframe}</span>
                      <span>{insight.generatedAt.toLocaleString('es-ES')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredInsights.length === 0 && !isGenerating && (
                <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                  <CardContent className="p-8 text-center">
                    <Brain className="h-12 w-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60 mb-2">No hay insights disponibles</p>
                    <p className="text-white/40 text-sm">
                      {activeCategory === 'all' 
                        ? 'Haz clic en "Actualizar Insights" para generar análisis inteligente'
                        : `No hay insights de categoría "${activeCategory}" disponibles`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi, index) => (
              <Card key={index} className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium text-sm">{kpi.name}</h4>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{kpi.value}</div>
                  {kpi.target && (
                    <div className="text-xs text-white/60">
                      Objetivo: {kpi.target}
                    </div>
                  )}
                  {kpi.description && (
                    <p className="text-xs text-white/50 mt-2">{kpi.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {actionPlans.map((plan, index) => (
                <Card key={index} className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      {plan.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {plan.steps?.length || 0} pasos
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {plan.timeline}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          plan.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                          plan.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        )}
                      >
                        {plan.priority} prioridad
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-white/80">{plan.description}</p>
                    
                    {plan.expectedImpact && (
                      <div>
                        <h4 className="text-white/70 font-medium mb-1">Impacto Esperado:</h4>
                        <p className="text-white/60 text-sm">{plan.expectedImpact}</p>
                      </div>
                    )}
                    
                    {plan.steps && plan.steps.length > 0 && (
                      <div>
                        <h4 className="text-white/70 font-medium mb-2">Pasos del Plan:</h4>
                        <div className="space-y-2">
                          {plan.steps.slice(0, 3).map((step, stepIndex) => (
                            <div key={stepIndex} className="flex items-start space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center mt-0.5">
                                {step.order}
                              </div>
                              <div>
                                <p className="text-white/80 text-sm font-medium">{step.title}</p>
                                <p className="text-white/60 text-xs">{step.description}</p>
                              </div>
                            </div>
                          ))}
                          {plan.steps.length > 3 && (
                            <p className="text-white/50 text-xs pl-8">
                              y {plan.steps.length - 3} pasos más...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}