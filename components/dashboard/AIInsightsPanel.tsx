"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Brain,
  RefreshCw,
  Info,
  CheckCircle2,
  BarChart,
  Activity,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GeneratedInsights {
  keyInsights: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
  summary: string;
  performanceHighlights?: string[];
  areaAnalysis?: string[];
  trendsAndPatterns?: string[];
  actionPriorities?: string[];
}

interface AIInsightsPanelProps {
  insights?: GeneratedInsights;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
  timeRange?: string;
  lastUpdated?: string;
}

interface InsightSectionProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

function InsightSection({ 
  title, 
  items, 
  icon, 
  color,
  expandable = true,
  defaultExpanded = false
}: InsightSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
  if (!items || items.length === 0) return null

  const displayItems = expandable && !isExpanded ? items.slice(0, 2) : items
  const hasMore = expandable && items.length > 2

  return (
    <Card className="h-full bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", color)}>
              {icon}
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs ml-auto">
              {items.length}
            </Badge>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {displayItems.map((item, index) => (
              <motion.div
                key={`${title}-${index}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-start gap-2"
              >
                <div className={cn(
                  "mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0",
                  color.includes('red') ? "bg-red-500" :
                  color.includes('green') ? "bg-green-500" :
                  color.includes('blue') ? "bg-blue-500" :
                  color.includes('yellow') ? "bg-yellow-500" :
                  color.includes('purple') ? "bg-purple-500" :
                  "bg-gray-500"
                )} />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

export function AIInsightsPanel({
  insights,
  loading = false,
  onRefresh,
  className,
  timeRange = "month",
  lastUpdated
}: AIInsightsPanelProps) {
  const [showAll, setShowAll] = useState(false)

  if (!insights) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Insights</CardTitle>
                <CardDescription className="text-sm">
                  Análisis inteligente de tu desempeño
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay datos suficientes para generar insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sections = [
    {
      title: "Observaciones Clave",
      items: insights.keyInsights || [],
      icon: <Eye className="h-4 w-4" />,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      priority: 1,
      defaultExpanded: true
    },
    {
      title: "Logros Destacados",
      items: insights.performanceHighlights || [],
      icon: <TrendingUp className="h-4 w-4" />,
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      priority: 2
    },
    {
      title: "Análisis por Área",
      items: insights.areaAnalysis || [],
      icon: <BarChart className="h-4 w-4" />,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      priority: 3
    },
    {
      title: "Tendencias y Patrones",
      items: insights.trendsAndPatterns || [],
      icon: <Activity className="h-4 w-4" />,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      priority: 4
    },
    {
      title: "Riesgos Identificados",
      items: insights.risks || [],
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "bg-red-500/10 text-red-600 dark:text-red-400",
      priority: 5
    },
    {
      title: "Oportunidades",
      items: insights.opportunities || [],
      icon: <Lightbulb className="h-4 w-4" />,
      color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      priority: 6
    },
    {
      title: "Recomendaciones",
      items: insights.recommendations || [],
      icon: <Target className="h-4 w-4" />,
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      priority: 7
    },
    {
      title: "Acciones Prioritarias",
      items: insights.actionPriorities || [],
      icon: <Zap className="h-4 w-4" />,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      priority: 8,
      defaultExpanded: true
    }
  ]

  // Filter out empty sections and sort by priority
  const activeSections = sections
    .filter(section => section.items && section.items.length > 0)
    .sort((a, b) => a.priority - b.priority)

  // Split sections for display
  const primarySections = showAll ? activeSections : activeSections.slice(0, 4)
  const hasMoreSections = activeSections.length > 4

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  AI Insights
                  <Badge variant="outline" className="text-xs font-normal">
                    Powered by Gemini
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  Análisis inteligente basado en {timeRange === 'all' ? 'todos los datos' : `último ${timeRange}`}
                </CardDescription>
              </div>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
                Actualizar
              </Button>
            )}
          </div>
        </CardHeader>
        
        {/* Executive Summary */}
        {insights.summary && (
          <CardContent className="pt-0">
            <Alert className="border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20">
              <Sparkles className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium">Resumen Ejecutivo</AlertTitle>
              <AlertDescription className="mt-2 text-sm leading-relaxed">
                {insights.summary}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Insights Grid - Responsive layout */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {primarySections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={cn(
              // Make key insights and action priorities span 2 columns on larger screens
              (section.title === "Observaciones Clave" || section.title === "Acciones Prioritarias") && 
              "md:col-span-2 lg:col-span-1 xl:col-span-2 2xl:col-span-2"
            )}
          >
            <InsightSection
              title={section.title}
              items={section.items}
              icon={section.icon}
              color={section.color}
              defaultExpanded={section.defaultExpanded}
            />
          </motion.div>
        ))}
      </div>

      {/* Show More Button */}
      {hasMoreSections && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="gap-2"
          >
            {showAll ? (
              <>
                Mostrar menos
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Mostrar {activeSections.length - 4} secciones más
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Footer with metadata */}
      {lastUpdated && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(lastUpdated).toLocaleString('es', { 
              dateStyle: 'short', 
              timeStyle: 'short' 
            })}
          </p>
        </div>
      )}
    </div>
  )
}