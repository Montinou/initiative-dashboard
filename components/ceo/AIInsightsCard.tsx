"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  ChevronRight,
  Brain,
  Sparkles,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIInsights } from '@/hooks/ceo/useAIInsights'
import { Skeleton } from '@/components/ui/skeleton'

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

const riskColors = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
}

const trendIcons = {
  improving: TrendingUp,
  stable: ChevronRight,
  declining: AlertTriangle,
}

export function AIInsightsCard() {
  const { insights, loading, error, cached, generatedAt, regenerate, regenerating } = useAIInsights()

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Insights Estratégicos con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Insights Estratégicos con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No se pudieron cargar los insights. Por favor, intente regenerarlos.
            </p>
            <Button 
              onClick={regenerate}
              disabled={regenerating}
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", regenerating && "animate-spin")} />
              Regenerar Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!insights) return null

  const TrendIcon = trendIcons[insights.performance_analysis.overall_trend]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Insights Estratégicos con IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {cached && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Guardado en caché
              </Badge>
            )}
            <Button 
              size="sm"
              variant="outline"
              onClick={regenerate}
              disabled={regenerating}
              className="border-border hover:bg-accent hover:text-accent-foreground"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", regenerating && "animate-spin")} />
              Regenerar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Executive Summary */}
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Resumen Ejecutivo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insights.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Insights Clave
          </h3>
          <div className="space-y-2">
            {insights.key_insights.map((insight, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/70 transition-colors border border-border/50"
              >
                <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground/80">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs for detailed sections */}
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card border border-border">
            <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
            <TabsTrigger value="risks">Riesgos</TabsTrigger>
            <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-3 mt-4">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className="p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">{rec.title}</h4>
                  <Badge className={cn("text-xs", priorityColors[rec.priority])}>
                    {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                <div className="flex items-start gap-2">
                  <Target className="h-3 w-3 text-primary mt-0.5" />
                  <p className="text-xs text-primary">Impacto: {rec.impact}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="risks" className="space-y-3 mt-4">
            {insights.risks.length > 0 ? (
              insights.risks.map((risk, index) => (
                <div key={index} className="p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-foreground">{risk.title}</h4>
                    <Badge className={cn("text-xs", riskColors[risk.level])}>
                      {risk.level === 'critical' ? 'Crítico' : 
                       risk.level === 'high' ? 'Alto' :
                       risk.level === 'medium' ? 'Medio' : 'Bajo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5" />
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Mitigación: {risk.mitigation}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p>No se identificaron riesgos significativos</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-3 mt-4">
            {insights.opportunities.length > 0 ? (
              insights.opportunities.map((opp, index) => (
                <div key={index} className="p-4 rounded-lg border border-border bg-card/50">
                  <h4 className="font-medium text-foreground mb-2">{opp.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-3 w-3 text-green-500 mt-0.5" />
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Valor potencial: {opp.potential_value}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p>Análisis de oportunidades en proceso</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            {/* Overall Trend */}
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground">Tendencia General</h4>
                <div className="flex items-center gap-2">
                  <TrendIcon className={cn(
                    "h-4 w-4",
                    insights.performance_analysis.overall_trend === 'improving' ? 'text-green-500' :
                    insights.performance_analysis.overall_trend === 'declining' ? 'text-red-500' :
                    'text-yellow-500'
                  )} />
                  <Badge variant="outline">
                    {insights.performance_analysis.overall_trend === 'improving' ? 'Mejorando' :
                     insights.performance_analysis.overall_trend === 'declining' ? 'Declinando' :
                     'Estable'}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {insights.performance_analysis.trend_explanation}
              </p>
            </div>

            {/* Best and Needs Attention Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-green-900 dark:text-green-100">Mejor Desempeño</h4>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {insights.performance_analysis.best_performing_area}
                </p>
              </div>
              
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Necesita Atención</h4>
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {insights.performance_analysis.needs_attention_area}
                </p>
              </div>
            </div>

            {/* Metrics Highlights */}
            <div className="space-y-3">
              {insights.metrics_highlights.positive.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                    Aspectos Positivos
                  </h5>
                  <div className="space-y-1">
                    {insights.metrics_highlights.positive.map((metric, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-foreground/80">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {insights.metrics_highlights.negative.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                    Áreas de Mejora
                  </h5>
                  <div className="space-y-1">
                    {insights.metrics_highlights.negative.map((metric, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className="text-sm text-foreground/80">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {insights.metrics_highlights.neutral.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                    Observaciones
                  </h5>
                  <div className="space-y-1">
                    {insights.metrics_highlights.neutral.map((metric, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span className="text-sm text-foreground/80">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Generated timestamp */}
        {generatedAt && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Insights generados: {new Date(generatedAt).toLocaleString('es-ES')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}