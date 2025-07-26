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
    case 'excellent': return '#10b981';
    case 'good': return '#06b6d4';
    case 'warning': return '#f59e0b';
    case 'critical': return '#ef4444';
    default: return '#6b7280';
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
          <Skeleton className="h-96 w-full bg-white/10" />
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 border border-white/20 rounded-lg p-3 text-white">
          <p className="font-semibold">{label}</p>
          <p className="text-cyan-400">
            Progreso promedio: {data.avgProgress}%
          </p>
          <p className="text-purple-400">
            Iniciativas: {data.initiativesCount}
          </p>
          <p className={`text-${data.status === 'excellent' ? 'green' : data.status === 'good' ? 'cyan' : data.status === 'warning' ? 'yellow' : 'red'}-400`}>
            Estado: {data.status}
          </p>
        </div>
      );
    }
    return null;
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
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vericalLayout"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number"
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <YAxis 
                type="category"
                dataKey="area"
                stroke="rgba(255,255,255,0.7)"
                fontSize={11}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="avgProgress" 
                fill="url(#areaGradient)"
                radius={[0, 4, 4, 0]}
              />
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Mejor área:</span>
            <span className="text-white font-medium">
              {data.reduce((max, item) => item.avgProgress > max.avgProgress ? item : max).area.split(' ')[1] || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Progreso más alto:</span>
            <span className="text-white font-medium">
              {Math.max(...data.map(d => d.avgProgress))}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Área con más riesgo:</span>
            <span className="text-white font-medium">
              {data.reduce((min, item) => item.avgProgress < min.avgProgress ? item : min).area.split(' ')[1] || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Promedio general:</span>
            <span className="text-white font-medium">
              {Math.round(data.reduce((sum, item) => sum + item.avgProgress, 0) / data.length)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}