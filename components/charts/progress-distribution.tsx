"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgressDistribution } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgressDistributionData {
  range: string;
  count: number;
  percentage: number;
}

interface ProgressDistributionProps {
  data?: ProgressDistributionData[];
  title?: string;
  description?: string;
  tenantId?: string;
}

export function ProgressDistributionChart({ 
  data: propData,
  title = "Distribución por Progreso",
  description = "Iniciativas por rango de avance",
  tenantId
}: ProgressDistributionProps) {
  const { data: apiData, loading, error } = useProgressDistribution(tenantId);
  
  // Use prop data if provided, otherwise use API data
  const data = propData || apiData || [];

  if (loading) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-destructive">
            Error de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No se pudieron cargar los datos: {error}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="range" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))'
                }}
                formatter={(value: number, name: string) => [
                  name === 'count' ? `${value} iniciativas` : `${value}%`,
                  name === 'count' ? 'Cantidad' : 'Porcentaje'
                ]}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total iniciativas:</span>
            <span className="text-foreground font-medium">{data.reduce((sum, item) => sum + item.count, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rango más común:</span>
            <span className="text-foreground font-medium">
              {data.reduce((max, item) => item.count > max.count ? item : max).range}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}