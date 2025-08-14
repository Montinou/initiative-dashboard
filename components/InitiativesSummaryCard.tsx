"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Target,
  AlertTriangle,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useInitiativesSummary } from '@/hooks/useInitiativesSummary';
import { cn } from '@/lib/utils';

interface InitiativesSummaryCardProps {
  className?: string;
}

export function InitiativesSummaryCard({ className }: InitiativesSummaryCardProps) {
  const { metrics, loading, error } = useInitiativesSummary();

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error al cargar resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resumen de Iniciativas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string, count: number) => {
    if (count === 0) return 'bg-secondary text-secondary-foreground';
    
    switch (status) {
      case 'completed':
        return 'bg-primary/10 text-primary';
      case 'in_progress':
        return 'bg-accent/10 text-accent-foreground';
      case 'on_hold':
        return 'bg-destructive/10 text-destructive';
      case 'planning':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const completionRate = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;
  const budgetUtilization = metrics.totalBudget > 0 ? (metrics.totalCost / metrics.totalBudget) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Resumen de Iniciativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{metrics.completed}</div>
            <div className="text-sm text-muted-foreground">Completadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{metrics.averageProgress}%</div>
            <div className="text-sm text-muted-foreground">Progreso Promedio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.totalSubtasks}</div>
            <div className="text-sm text-muted-foreground">Subtareas</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tasa de Completitud</span>
              <span className="text-sm text-muted-foreground">{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completitud de Subtareas</span>
              <span className="text-sm text-muted-foreground">{metrics.averageSubtaskCompletion}%</span>
            </div>
            <Progress value={metrics.averageSubtaskCompletion} className="h-2" />
          </div>

          {metrics.totalBudget > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Utilización de Presupuesto
                </span>
                <span className="text-sm text-muted-foreground">{budgetUtilization.toFixed(1)}%</span>
              </div>
              <Progress 
                value={budgetUtilization} 
                className={cn(
                  "h-2",
                  budgetUtilization > 100 ? "bg-destructive/20" : "bg-secondary"
                )}
              />
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div>
          <h4 className="text-sm font-medium mb-3">Estado de Iniciativas</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <span className="text-sm">Planificación</span>
              <Badge className={getStatusColor('planning', metrics.planning)}>
                {metrics.planning}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <span className="text-sm">En Progreso</span>
              <Badge className={getStatusColor('in_progress', metrics.inProgress)}>
                {metrics.inProgress}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <span className="text-sm">Completadas</span>
              <Badge className={getStatusColor('completed', metrics.completed)}>
                {metrics.completed}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <span className="text-sm">En Pausa</span>
              <Badge className={getStatusColor('on_hold', metrics.onHold)}>
                {metrics.onHold}
              </Badge>
            </div>
          </div>
        </div>

        {/* Budget Summary */}
        {metrics.withBudget > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Resumen Presupuestario
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-foreground">
                  ${metrics.totalBudget.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Presupuesto Total</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-accent">
                  ${metrics.totalCost.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Costo Real</div>
              </div>
              <div>
                <div className={cn(
                  "text-lg font-semibold",
                  metrics.totalCost > metrics.totalBudget ? "text-destructive" : "text-primary"
                )}>
                  ${(metrics.totalBudget - metrics.totalCost).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {metrics.totalCost > metrics.totalBudget ? 'Sobrecosto' : 'Restante'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {metrics.overdue > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <Calendar className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              <strong>{metrics.overdue}</strong> iniciativa{metrics.overdue > 1 ? 's' : ''} vencida{metrics.overdue > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}