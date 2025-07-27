"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStatusDistribution } from '@/hooks/useChartData';
import { Skeleton } from '@/components/ui/skeleton';

interface StatusDistributionData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface StatusDonutProps {
  data?: StatusDistributionData[];
  title?: string;
  description?: string;
  tenantId?: string;
}

const STATUS_COLORS = {
  'En Curso': '#06b6d4',
  'Completado': '#10b981',
  'Atrasado': '#f59e0b',
  'En Pausa': '#ef4444',
};

export function StatusDonutChart({ 
  data: propData,
  title = "Distribución por Estado",
  description = "Estado actual de las iniciativas",
  tenantId
}: StatusDonutProps) {
  const { data: apiData, loading, error } = useStatusDistribution(tenantId);
  
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
  const renderCustomLabel = (entry: any) => {
    return entry.percentage > 0 ? `${entry.percentage}%` : '';
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-white/70">
              {entry.value}: {data.find(d => d.status === entry.value)?.count || 0}
            </span>
          </div>
        ))}
      </div>
    );
  };

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
            <PieChart>
              <Pie
                data={data.filter(item => item.count > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {data.filter(item => item.count > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
                formatter={(value: number, name: string) => [
                  `${value} iniciativas (${data.find(d => d.count === value)?.percentage}%)`,
                  'Cantidad'
                ]}
              />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Total iniciativas:</span>
            <span className="text-white font-medium">{data.reduce((sum, item) => sum + item.count, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Estado principal:</span>
            <span className="text-white font-medium">
              {data.reduce((max, item) => item.count > max.count ? item : max).status}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}