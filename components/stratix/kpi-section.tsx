'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Bot, 
  ArrowUp,
  ArrowDown,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { StratixKPI } from '@/lib/stratix/api-client'

interface KPISectionProps {
  kpis: StratixKPI[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export function KPISection({ kpis, isLoading, error, onRefresh }: KPISectionProps) {
  const criticalKPIs = kpis.filter(kpi => kpi.priority === 'high')

  if (isLoading) {
    return (
      <Card className="glassmorphic-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              KPIs Principales
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-white/20 rounded w-1/2 mb-2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-white/20 rounded w-16"></div>
                  <div className="h-4 bg-white/20 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glassmorphic-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              KPIs Principales
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Error al cargar KPIs</h3>
            <p className="text-white/70 mb-4">{error}</p>
            <Button onClick={onRefresh} className="bg-primary">
              <Bot className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glassmorphic-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            KPIs Principales
            {criticalKPIs.length > 0 && (
              <Badge 
                variant="outline" 
                className="ml-2 border-red-500/50 text-red-400 bg-red-500/10"
              >
                {criticalKPIs.length} Críticos
              </Badge>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefresh}
              className="text-white/70 hover:text-white"
            >
              <Bot className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <KPICard key={index} kpi={kpi} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface KPICardProps {
  kpi: StratixKPI
}

function KPICard({ kpi }: KPICardProps) {
  return (
    <div
      className={cn(
        "bg-white/5 backdrop-blur-sm rounded-lg p-4 border transition-all duration-300",
        kpi.priority === 'high' ? 'border-red-500/30 hover:border-red-500/50' :
        kpi.priority === 'medium' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
        'border-white/10 hover:border-primary/30'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div 
            className={cn(
              "w-2 h-2 rounded-full",
              kpi.priority === 'high' ? 'bg-red-400' :
              kpi.priority === 'medium' ? 'bg-yellow-400' :
              'bg-green-400'
            )} 
          />
          <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
            {kpi.category || 'Métrica'}
          </span>
        </div>
        <Badge variant="outline" className={cn(
          "text-xs px-2 py-0.5",
          kpi.priority === 'high' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 
          kpi.priority === 'medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 
          'border-green-500/50 text-green-400 bg-green-500/10'
        )}>
          {kpi.priority}
        </Badge>
      </div>
      
      <div className="mb-2">
        <h3 className="text-sm font-medium text-white/90 mb-1">{kpi.name}</h3>
        {kpi.description && (
          <p className="text-xs text-white/60">{kpi.description}</p>
        )}
      </div>
      
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{kpi.value}</span>
          {kpi.target && (
            <span className="text-xs text-white/50">/ {kpi.target}</span>
          )}
        </div>
        <div className={cn(
          "flex items-center text-sm font-medium px-2 py-1 rounded-md",
          kpi.trend === 'up' ? 'text-green-400 bg-green-500/10' : 
          kpi.trend === 'down' ? 'text-red-400 bg-red-500/10' : 
          'text-gray-400 bg-gray-500/10'
        )}>
          {kpi.trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : 
           kpi.trend === 'down' ? <ArrowDown className="h-3 w-3 mr-1" /> : 
           <span className="w-3 h-3 mr-1 flex items-center justify-center">—</span>}
          {Math.abs(kpi.trendValue)}%
        </div>
      </div>
      
      {kpi.priority === 'high' && (
        <div className="mt-3 pt-2 border-t border-white/10">
          <span className="text-xs text-red-400 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Requiere atención
          </span>
        </div>
      )}
    </div>
  )
}