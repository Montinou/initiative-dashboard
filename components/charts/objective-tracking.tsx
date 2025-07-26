"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ObjectiveData {
  objective: string;
  progress: number;
  obstacles: string;
  enablers: string;
  status: '🟢' | '🟡' | '🔴';
  area: string;
}

interface ObjectiveTrackingProps {
  data: ObjectiveData[];
  area: string;
  title?: string;
  description?: string;
}

const getAreaData = (area: string): ObjectiveData[] => {
  // This function is now deprecated as we use API data
  // Kept for backward compatibility
  const areaObjectives = {
    'RRHH': [
      {
        objective: 'Retención de talento',
        progress: 30,
        obstacles: 'Altas rotaciones',
        enablers: 'Nuevo líder comprometido',
        status: '🔴' as const,
        area: 'RRHH'
      },
      {
        objective: 'Digitalización legajos',
        progress: 90,
        obstacles: 'Falta de histórico',
        enablers: 'Buena predisposición',
        status: '🟢' as const,
        area: 'RRHH'
      }
    ],
    'Administración': [
      {
        objective: 'Reducir tiempos de facturación',
        progress: 45,
        obstacles: 'Procesos manuales',
        enablers: 'Automatización parcial',
        status: '🟡' as const,
        area: 'Administración'
      },
      {
        objective: 'Control de gastos',
        progress: 30,
        obstacles: 'Demoras en reportes',
        enablers: 'Apoyo de gerencia',
        status: '🔴' as const,
        area: 'Administración'
      }
    ],
    'Comercial': [
      {
        objective: 'Implementar CRM',
        progress: 50,
        obstacles: 'Falta de tiempo',
        enablers: 'Capacitación previa',
        status: '🟢' as const,
        area: 'Comercial'
      },
      {
        objective: 'Forecast comercial',
        progress: 60,
        obstacles: 'Datos inconsistentes',
        enablers: 'Sistema de control',
        status: '🟡' as const,
        area: 'Comercial'
      }
    ],
    'Producto': [
      {
        objective: 'Nueva funcionalidad',
        progress: 70,
        obstacles: 'Recursos limitados',
        enablers: 'Clientes aliados',
        status: '🟡' as const,
        area: 'Producto'
      },
      {
        objective: 'Reducir bugs críticos',
        progress: 40,
        obstacles: 'Errores de integración',
        enablers: 'Equipo técnico comprometido',
        status: '🔴' as const,
        area: 'Producto'
      }
    ]
  };

  return areaObjectives[area as keyof typeof areaObjectives] || [];
};

const getProgressColor = (progress: number) => {
  if (progress >= 75) return '#10b981'; // Green
  if (progress >= 50) return '#f59e0b'; // Yellow
  if (progress >= 25) return '#f97316'; // Orange
  return '#ef4444'; // Red
};

export function ObjectiveTrackingChart({ 
  data,
  area,
  title,
  description
}: ObjectiveTrackingProps) {
  const chartData = data || getAreaData(area);
  const chartTitle = title || `Avance de Objetivos - ${area}`;
  const chartDescription = description || `Seguimiento detallado de objetivos del área ${area}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-4 text-white max-w-sm">
          <p className="font-semibold text-cyan-400 mb-2">{label}</p>
          <p className="text-sm mb-1">
            <span className="text-white/70">Progreso:</span> {data.progress}%
          </p>
          <p className="text-sm mb-1">
            <span className="text-white/70">Estado:</span> {data.status}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-xs text-red-300 mb-1">
              <span className="font-semibold">Obstáculos:</span> {data.obstacles}
            </p>
            <p className="text-xs text-green-300">
              <span className="font-semibold">Potenciadores:</span> {data.enablers}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          {chartTitle}
        </CardTitle>
        <CardDescription className="text-white/70">
          {chartDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="objective" 
                stroke="rgba(255,255,255,0.7)"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.7)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getProgressColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Detailed objective list */}
        <div className="space-y-3">
          {chartData.map((objective, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{objective.objective}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                    {objective.progress}%
                  </Badge>
                  <span className="text-lg">{objective.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-red-300 font-medium">Obstáculos:</span>
                  <p className="text-white/70 mt-1">{objective.obstacles}</p>
                </div>
                <div>
                  <span className="text-green-300 font-medium">Potenciadores:</span>
                  <p className="text-white/70 mt-1">{objective.enablers}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between text-sm border-t border-white/20 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-white/70">Progreso promedio:</span>
            <span className="text-white font-medium">
              {Math.round(chartData.reduce((sum, obj) => sum + obj.progress, 0) / chartData.length)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70">Objetivos en riesgo:</span>
            <span className="text-white font-medium">
              {chartData.filter(obj => obj.status === '🔴').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}