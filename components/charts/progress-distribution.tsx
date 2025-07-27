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
      <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {title}
          </CardTitle>
          <CardDescription className="text-white/70">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-red-400">
            Error de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">No se pudieron cargar los datos: {error}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        <CardDescription className="text-white/70">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="range" 
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                formatter={(value: number, name: string) => [
                  name === 'count' ? `${value} iniciativas` : `${value}%`,
                  name === 'count' ? 'Cantidad' : 'Porcentaje'
                ]}
              />
              <Bar 
                dataKey="count" 
                fill="url(#progressGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Total iniciativas:</span>
            <span className="text-white font-medium">{data.reduce((sum, item) => sum + item.count, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Rango más común:</span>
            <span className="text-white font-medium">
              {data.reduce((max, item) => item.count > max.count ? item : max).range}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}