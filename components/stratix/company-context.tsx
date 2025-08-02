'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Target, 
  BarChart3, 
  Bot, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react"
import type { CompanyContext } from '@/lib/stratix/data-service'

interface CompanyContextSectionProps {
  companyContext: CompanyContext | null
  onRefresh: () => void
  onQuickAction: (message: string) => void
}

export function CompanyContextSection({ 
  companyContext, 
  onRefresh, 
  onQuickAction 
}: CompanyContextSectionProps) {
  if (!companyContext) {
    return null
  }

  return (
    <Card className="glassmorphic-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Contexto de la Empresa
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            className="text-primary"
          >
            <Bot className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Target className="h-4 w-4 text-green-400" />}
            label="Iniciativas"
            value={companyContext.company.totalInitiatives}
            subtitle={`${companyContext.company.activeInitiatives} activas`}
            detail={`${companyContext.company.completedInitiatives} completadas`}
            color="green"
          />
          
          <MetricCard
            icon={<Users className="h-4 w-4 text-blue-400" />}
            label="Áreas"
            value={companyContext.company.totalAreas}
            subtitle="organizacionales"
            color="blue"
          />
          
          <MetricCard
            icon={<BarChart3 className="h-4 w-4 text-purple-400" />}
            label="Presupuesto"
            value={`$${(companyContext.company.activeBudget / 1000).toFixed(0)}k`}
            subtitle="asignado"
            color="purple"
          />
          
          <MetricCard
            icon={<Users className="h-4 w-4 text-cyan-400" />}
            label="Usuarios"
            value={companyContext.company.totalUsers}
            subtitle="registrados"
            color="cyan"
          />
        </div>
        
        {/* Quick Context Actions */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            <QuickActionButton
              icon={<Target className="h-3 w-3 mr-1" />}
              label="Iniciativas Clave"
              onClick={() => onQuickAction("¿Cuáles son las iniciativas más importantes?")}
            />
            <QuickActionButton
              icon={<BarChart3 className="h-3 w-3 mr-1" />}
              label="Análisis Presupuesto"
              onClick={() => onQuickAction("¿Cómo está el presupuesto?")}
            />
            <QuickActionButton
              icon={<AlertCircle className="h-3 w-3 mr-1" />}
              label="Áreas de Riesgo"
              onClick={() => onQuickAction("¿Qué áreas necesitan atención?")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtitle: string
  detail?: string
  color: 'green' | 'blue' | 'purple' | 'cyan'
}

function MetricCard({ icon, label, value, subtitle, detail, color }: MetricCardProps) {
  const colorClasses = {
    green: 'hover:border-green-500/30 group',
    blue: 'hover:border-blue-500/30 group',
    purple: 'hover:border-purple-500/30 group',
    cyan: 'hover:border-cyan-500/30 group'
  }

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 transition-colors ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-white/60 font-medium uppercase tracking-wide">{label}</div>
        <div className="opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center justify-between">
        <div className={`text-xs font-medium text-${color}-400`}>{subtitle}</div>
        {detail && <div className="text-xs text-white/50">{detail}</div>}
      </div>
    </div>
  )
}

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  )
}