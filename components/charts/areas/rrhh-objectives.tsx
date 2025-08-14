"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';
import { useAreaObjectives } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RRHHObjectivesChartProps {
  tenantId?: string;
}

export function RRHHObjectivesChart({ tenantId }: RRHHObjectivesChartProps) {
  const { data, loading, error } = useAreaObjectives('RRHH', tenantId);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Objetivos RRHH - Q2
          </CardTitle>
          <CardDescription>
            Seguimiento de iniciativas de Recursos Humanos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-destructive">
            Error de Datos - RRHH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No se pudieron cargar los objetivos de RRHH: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ObjectiveTrackingChart
      data={data || []}
      area="RRHH"
      title="Objetivos RRHH - Q2"
      description="Seguimiento de iniciativas de Recursos Humanos"
    />
  );
}