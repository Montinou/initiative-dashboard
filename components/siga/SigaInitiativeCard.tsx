'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SigaBadge } from '@/components/ui/badge-siga'
import { SigaButton } from '@/components/ui/button-siga'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, Target, TrendingUp, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Initiative {
  id: string
  title: string
  description: string
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  progress: number
  startDate: string
  endDate: string
  owner: {
    name: string
    avatar?: string
  }
  team: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  budget?: number
  spent?: number
}

interface SigaInitiativeCardProps {
  initiative: Initiative
  className?: string
  onEdit?: (id: string) => void
  onView?: (id: string) => void
}

export function SigaInitiativeCard({ 
  initiative, 
  className,
  onEdit,
  onView 
}: SigaInitiativeCardProps) {
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'accent'
      case 'on_hold':
        return 'warning'
      case 'planning':
      default:
        return 'secondary'
    }
  }
  
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'primary'
      case 'medium':
        return 'accent'
      case 'low':
      default:
        return 'secondary'
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'in_progress':
        return <TrendingUp className="h-4 w-4" />
      case 'on_hold':
        return <AlertCircle className="h-4 w-4" />
      case 'planning':
      default:
        return <Target className="h-4 w-4" />
    }
  }
  
  const statusLabels = {
    planning: 'Planificación',
    in_progress: 'En Progreso',
    completed: 'Completado',
    on_hold: 'En Pausa'
  }
  
  const priorityLabels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica'
  }
  
  const budgetUtilization = initiative.budget && initiative.spent 
    ? (initiative.spent / initiative.budget) * 100 
    : 0
  
  return (
    <Card className={cn(
      "hover:shadow-lg transition-all duration-300",
      "border-siga-green/20 hover:border-siga-green/50",
      "dark:border-siga-dark-border dark:hover:border-siga-green-dark/50",
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{initiative.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {initiative.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <SigaBadge variant={getStatusVariant(initiative.status)} size="sm">
              <span className="flex items-center gap-1">
                {getStatusIcon(initiative.status)}
                {statusLabels[initiative.status]}
              </span>
            </SigaBadge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{initiative.progress}%</span>
          </div>
          <Progress 
            value={initiative.progress} 
            className={cn(
              "h-2",
              initiative.progress === 100 && "bg-siga-green-100"
            )}
          />
        </div>
        
        {/* Budget (if available) */}
        {initiative.budget && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Presupuesto</span>
              <span className={cn(
                "font-medium",
                budgetUtilization > 100 && "text-destructive"
              )}>
                ${initiative.spent?.toLocaleString()} / ${initiative.budget.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={budgetUtilization} 
              className={cn(
                "h-2",
                budgetUtilization > 100 && "bg-destructive/20"
              )}
            />
          </div>
        )}
        
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{new Date(initiative.endDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{initiative.team} miembros</span>
          </div>
        </div>
        
        {/* Owner and Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={initiative.owner.avatar} />
              <AvatarFallback className="bg-siga-green-100 text-siga-green-700 dark:bg-siga-green-dark/20 dark:text-siga-green-dark">
                {initiative.owner.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{initiative.owner.name}</p>
              <p className="text-muted-foreground">Responsable</p>
            </div>
          </div>
          <SigaBadge 
            variant={getPriorityVariant(initiative.priority)} 
            size="sm"
          >
            Prioridad {priorityLabels[initiative.priority]}
          </SigaBadge>
        </div>
      </CardContent>
      
      <CardFooter className="gap-2">
        <SigaButton 
          variant="primary" 
          className="flex-1"
          onClick={() => onView?.(initiative.id)}
        >
          Ver Detalles
        </SigaButton>
        <SigaButton 
          variant="outline-green"
          onClick={() => onEdit?.(initiative.id)}
        >
          Editar
        </SigaButton>
      </CardFooter>
    </Card>
  )
}