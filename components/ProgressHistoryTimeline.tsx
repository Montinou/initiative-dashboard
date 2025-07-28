"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  User,
  Calendar
} from 'lucide-react';
import { useProgressHistory, type ProgressHistoryEntry } from '@/hooks/useProgressHistory';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProgressHistoryTimelineProps {
  initiativeId: string;
}

export function ProgressHistoryTimeline({ initiativeId }: ProgressHistoryTimelineProps) {
  const { history, loading, error } = useProgressHistory(initiativeId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Progreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Error al cargar historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Progreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay cambios de progreso registrados aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getProgressIcon = (previous: number, current: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-blue-600" />;
  };

  const getProgressBadge = (previous: number, current: number) => {
    const diff = current - previous;
    if (diff > 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">+{diff}%</Badge>;
    } else if (diff < 0) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">{diff}%</Badge>;
    }
    return <Badge variant="secondary">Sin cambios</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historial de Progreso ({history.length} cambios)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline line */}
              {index < history.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
              )}
              
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                  {getProgressIcon(entry.previous_progress, entry.new_progress)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {entry.previous_progress}% → {entry.new_progress}%
                        </span>
                        {getProgressBadge(entry.previous_progress, entry.new_progress)}
                      </div>
                      
                      {/* Progress bars */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Anterior:</span>
                          <Progress value={entry.previous_progress} className="flex-1" />
                          <span>{entry.previous_progress}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Nuevo:</span>
                          <Progress value={entry.new_progress} className="flex-1" />
                          <span>{entry.new_progress}%</span>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {entry.progress_notes && (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1">Notas:</p>
                          <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            {entry.progress_notes}
                          </p>
                        </div>
                      )}
                      
                      {/* Obstacles */}
                      {entry.obstacles && (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1 text-red-700">Obstáculos:</p>
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {entry.obstacles}
                          </p>
                        </div>
                      )}
                      
                      {/* Enhancers */}
                      {entry.enhancers && (
                        <div className="mb-2">
                          <p className="text-sm font-medium mb-1 text-green-700">Facilitadores:</p>
                          <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                            {entry.enhancers}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span>{entry.user_profiles?.full_name || 'Usuario desconocido'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                            locale: es
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}