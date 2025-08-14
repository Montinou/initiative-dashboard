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
  if (progress >= 75) return 'hsl(var(--primary))'; // Verde Siga
  if (progress >= 50) return 'hsl(var(--accent))'; // Amarillo Siga
  if (progress >= 25) return 'hsl(var(--accent))'; // Amarillo Siga variante
  return 'hsl(var(--destructive))'; // Rojo
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
        <div className="bg-card border border-border rounded-lg p-4 text-card-foreground max-w-sm shadow-lg">
          <p className="font-semibold text-primary mb-2">{label}</p>
          <p className="text-sm mb-1">
            <span className="text-muted-foreground">Progreso:</span> {data.progress}%
          </p>
          <p className="text-sm mb-1">
            <span className="text-muted-foreground">Estado:</span> {data.status}
          </p>
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-destructive mb-1">
              <span className="font-semibold">Obstáculos:</span> {data.obstacles}
            </p>
            <p className="text-xs text-primary">
              <span className="font-semibold">Potenciadores:</span> {data.enablers}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          {chartTitle}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {chartDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="objective" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
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
            <div key={index} className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">{objective.objective}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-card text-card-foreground border-border">
                    {objective.progress}%
                  </Badge>
                  <span className="text-lg">{objective.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-destructive font-medium">Obstáculos:</span>
                  <p className="text-muted-foreground mt-1">{objective.obstacles}</p>
                </div>
                <div>
                  <span className="text-primary font-medium">Potenciadores:</span>
                  <p className="text-muted-foreground mt-1">{objective.enablers}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between text-sm border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Progreso promedio:</span>
            <span className="text-foreground font-medium">
              {Math.round(chartData.reduce((sum, obj) => sum + obj.progress, 0) / chartData.length)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Objetivos en riesgo:</span>
            <span className="text-foreground font-medium">
              {chartData.filter(obj => obj.status === '🔴').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}