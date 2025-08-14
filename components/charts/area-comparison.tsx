"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAreaComparison } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';

interface AreaProgressData {
  area: string;
  avgProgress: number;
  initiativesCount: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface AreaComparisonProps {
  data?: AreaProgressData[];
  title?: string;
  description?: string;
  tenantId?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'hsl(var(--primary))';
    case 'good': return 'hsl(var(--primary))';
    case 'warning': return 'hsl(var(--accent))';
    case 'critical': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--muted-foreground))';
  }
};

export function AreaComparisonChart({ 
  data: propData,
  title = "Progreso Promedio por Área",
  description = "Comparación del rendimiento entre áreas organizacionales",
  tenantId
}: AreaComparisonProps) {
  const { data: apiData, loading, error } = useAreaComparison(tenantId);
  
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
          <Skeleton className="h-96 w-full" />
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 text-card-foreground shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">
            Progreso promedio: {data.avgProgress}%
          </p>
          <p className="text-muted-foreground">
            Iniciativas: {data.initiativesCount}
          </p>
          <p className="text-foreground">
            Estado: {data.status}
          </p>
        </div>
      );
    }
    return null;
  };

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
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                type="category"
                dataKey="area"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="avgProgress" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mejor área:</span>
            <span className="text-foreground font-medium">
              {data.reduce((max, item) => item.avgProgress > max.avgProgress ? item : max).area.split(' ')[1] || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progreso más alto:</span>
            <span className="text-foreground font-medium">
              {Math.max(...data.map(d => d.avgProgress))}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Área con más riesgo:</span>
            <span className="text-foreground font-medium">
              {data.reduce((min, item) => item.avgProgress < min.avgProgress ? item : min).area.split(' ')[1] || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Promedio general:</span>
            <span className="text-foreground font-medium">
              {Math.round(data.reduce((sum, item) => sum + item.avgProgress, 0) / data.length)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}