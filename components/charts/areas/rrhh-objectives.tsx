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
      <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Objetivos RRHH - Q2
          </CardTitle>
          <CardDescription className="text-white/70">
            Seguimiento de iniciativas de Recursos Humanos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-red-400">
            Error de Datos - RRHH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">No se pudieron cargar los objetivos de RRHH: {error}</p>
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