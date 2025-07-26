# Guía de Integración de Gráficos

## Introducción

Esta guía detalla cómo integrar y personalizar los componentes de gráficos para el sistema de gestión organizacional, incluyendo los gráficos estratégicos principales y los gráficos de seguimiento por área.

## Arquitectura de Componentes

### Estructura de Archivos

```
components/charts/
├── index.ts                    # Exportaciones principales
├── progress-distribution.tsx   # Gráfico de barras - distribución de progreso
├── status-donut.tsx           # Gráfico de dona - estados de iniciativas  
├── area-comparison.tsx        # Gráfico de barras - comparación entre áreas
├── objective-tracking.tsx     # Componente base para seguimiento de objetivos
└── areas/                     # Componentes específicos por área
    ├── rrhh-objectives.tsx
    ├── administracion-objectives.tsx
    ├── comercial-objectives.tsx
    └── producto-objectives.tsx
```

## Gráficos Estratégicos Principales

### 1. Distribución por Progreso (Bar Chart)

**Propósito**: Visualizar la salud general del portafolio de proyectos

```typescript
import { ProgressDistributionChart } from '@/components/charts';

// Estructura de datos
interface ProgressDistributionData {
  range: string;        // "0-25%", "26-50%", etc.
  count: number;        // Cantidad de iniciativas
  percentage: number;   // Porcentaje del total
}

// Uso básico
<ProgressDistributionChart 
  data={progressData}
  title="Distribución por Progreso"
  description="Iniciativas por rango de avance"
/>
```

**Configuración de Datos**:
```typescript
const progressData = [
  { range: '0-25%', count: 3, percentage: 27 },
  { range: '26-50%', count: 4, percentage: 36 },
  { range: '51-75%', count: 2, percentage: 18 },
  { range: '76-100%', count: 2, percentage: 18 },
];
```

### 2. Distribución por Estado (Donut Chart)

**Propósito**: Diagnóstico rápido de cuellos de botella

```typescript
import { StatusDonutChart } from '@/components/charts';

// Estructura de datos
interface StatusDistributionData {
  status: string;       // "En Curso", "Completado", etc.
  count: number;        // Cantidad de iniciativas
  percentage: number;   // Porcentaje del total
  color: string;        // Color hexadecimal
}

// Uso básico
<StatusDonutChart 
  data={statusData}
  title="Distribución por Estado"
  description="Estado actual de las iniciativas"
/>
```

### 3. Progreso Promedio por Área (Horizontal Bar Chart)

**Propósito**: Comparación objetiva entre unidades de negocio

```typescript
import { AreaComparisonChart } from '@/components/charts';

// Estructura de datos
interface AreaProgressData {
  area: string;                              // Nombre del área
  avgProgress: number;                       // Progreso promedio (0-100)
  initiativesCount: number;                  // Cantidad de iniciativas
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

// Uso básico
<AreaComparisonChart 
  data={areaData}
  title="Progreso Promedio por Área"
  description="Comparación del rendimiento entre áreas"
/>
```

## Gráficos de Seguimiento por Área

### Componente Base: ObjectiveTrackingChart

Todos los gráficos de área utilizan este componente base:

```typescript
import { ObjectiveTrackingChart } from '@/components/charts';

// Estructura de datos
interface ObjectiveData {
  objective: string;    // Nombre del objetivo
  progress: number;     // Progreso actual (0-100)
  obstacles: string;    // Obstáculos identificados
  enablers: string;     // Factores facilitadores
  status: '🟢' | '🟡' | '🔴';  // Estado visual
  area: string;         // Área organizacional
}

// Uso directo
<ObjectiveTrackingChart
  data={objectives}
  area="RRHH"
  title="Objetivos RRHH - Q2"
  description="Seguimiento de iniciativas de Recursos Humanos"
/>
```

### Componentes Específicos por Área

#### RRHH
```typescript
import { RRHHObjectivesChart } from '@/components/charts';

<RRHHObjectivesChart />
```

#### Administración
```typescript
import { AdministracionObjectivesChart } from '@/components/charts';

<AdministracionObjectivesChart />
```

#### Comercial
```typescript
import { ComercialObjectivesChart } from '@/components/charts';

<ComercialObjectivesChart />
```

#### Producto
```typescript
import { ProductoObjectivesChart } from '@/components/charts';

<ProductoObjectivesChart />
```

## Integración con Fuentes de Datos

### Conexión con API

```typescript
// hooks/useChartData.ts
export function useProgressDistribution() {
  const [data, setData] = useState<ProgressDistributionData[]>([]);
  
  useEffect(() => {
    // TODO: Reemplazar con llamada real a API
    fetchProgressDistribution()
      .then(setData)
      .catch(console.error);
  }, []);
  
  return data;
}

// Uso en componente
function Dashboard() {
  const progressData = useProgressDistribution();
  
  return (
    <ProgressDistributionChart data={progressData} />
  );
}
```

### Transformación de Datos

```typescript
// utils/chartDataTransformers.ts
export function transformInitiativesToProgress(initiatives: Initiative[]): ProgressDistributionData[] {
  const ranges = [
    { min: 0, max: 25, label: '0-25%' },
    { min: 26, max: 50, label: '26-50%' },
    { min: 51, max: 75, label: '51-75%' },
    { min: 76, max: 100, label: '76-100%' }
  ];
  
  return ranges.map(range => {
    const count = initiatives.filter(i => 
      i.progress >= range.min && i.progress <= range.max
    ).length;
    
    return {
      range: range.label,
      count,
      percentage: Math.round((count / initiatives.length) * 100)
    };
  });
}
```

## Personalización y Styling

### Sistema de Colores Glassmorphism

```css
:root {
  /* Gradientes principales */
  --chart-gradient-from: #a855f7;  /* Purple */
  --chart-gradient-to: #06b6d4;    /* Cyan */
  
  /* Estados */
  --status-excellent: #10b981;     /* Green */
  --status-good: #06b6d4;         /* Cyan */
  --status-warning: #f59e0b;      /* Yellow */
  --status-critical: #ef4444;     /* Red */
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-backdrop: blur(12px);
}
```

### Componente de Dashboard Completo

```typescript
// components/strategic-dashboard.tsx
export function StrategicDashboard() {
  const progressData = useProgressDistribution();
  const statusData = useStatusDistribution();
  const areaData = useAreaComparison();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráficos estratégicos principales */}
      <ProgressDistributionChart data={progressData} />
      <StatusDonutChart data={statusData} />
      <div className="lg:col-span-2">
        <AreaComparisonChart data={areaData} />
      </div>
      
      {/* Gráficos por área */}
      <RRHHObjectivesChart />
      <AdministracionObjectivesChart />
      <ComercialObjectivesChart />
      <ProductoObjectivesChart />
    </div>
  );
}
```

## Control de Acceso por Roles

### Restricciones de Visualización

```typescript
// components/role-based-chart.tsx
export function RoleBasedChart({ children, requiredRole }: {
  children: React.ReactNode;
  requiredRole: UserRole;
}) {
  const { user } = useAuth();
  const { canView } = usePermissions();
  
  if (!canView('viewDashboards')) {
    return <AccessDeniedCard />;
  }
  
  // Managers solo ven su área
  if (user.role === 'Manager') {
    return <AreaSpecificView area={user.area} />;
  }
  
  return <>{children}</>;
}
```

### Filtrado por Área para Managers

```typescript
// components/manager-dashboard.tsx
export function ManagerDashboard({ area }: { area: string }) {
  const areaObjectives = useAreaObjectives(area);
  
  return (
    <div className="space-y-6">
      <ObjectiveTrackingChart
        data={areaObjectives}
        area={area}
        title={`Objetivos ${area} - Q2`}
      />
      {/* Otros componentes específicos del área */}
    </div>
  );
}
```

## Responsividad y Mobile

### Configuración Responsive

```typescript
// hooks/useResponsiveCharts.ts
export function useResponsiveCharts() {
  const [isMobile] = useMobile();
  
  return {
    chartHeight: isMobile ? 250 : 400,
    showLegend: !isMobile,
    fontSize: isMobile ? 10 : 12,
    margin: isMobile 
      ? { top: 10, right: 10, left: 10, bottom: 10 }
      : { top: 20, right: 30, left: 20, bottom: 5 }
  };
}
```

## Testing y Validación

### Tests de Componentes

```typescript
// __tests__/charts/progress-distribution.test.tsx
describe('ProgressDistributionChart', () => {
  const mockData = [
    { range: '0-25%', count: 3, percentage: 27 },
    { range: '26-50%', count: 4, percentage: 36 }
  ];
  
  test('renders chart with correct data', () => {
    render(<ProgressDistributionChart data={mockData} />);
    
    expect(screen.getByText('Distribución por Progreso')).toBeInTheDocument();
    expect(screen.getByText('3 iniciativas')).toBeInTheDocument();
  });
});
```

## Performance y Optimización

### Lazy Loading de Gráficos

```typescript
// Lazy loading para componentes pesados
const LazyAreaComparison = lazy(() => 
  import('@/components/charts').then(m => ({ default: m.AreaComparisonChart }))
);

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyAreaComparison data={areaData} />
    </Suspense>
  );
}
```

### Memoización de Datos

```typescript
// Optimización con React.memo y useMemo
export const ProgressDistributionChart = React.memo(function ProgressDistributionChart({
  data,
  title,
  description
}: ProgressDistributionProps) {
  const chartConfig = useMemo(() => ({
    height: 320,
    margin: { top: 20, right: 30, left: 20, bottom: 5 }
  }), []);
  
  // Resto del componente...
});
```

## Troubleshooting

### Problemas Comunes

1. **Gráficos no se renderizan**:
   - Verificar que Recharts esté instalado
   - Confirmar que los datos tengan la estructura correcta
   - Revisar consola por errores de TypeScript

2. **Datos no se actualizan**:
   - Verificar que las dependencias de useEffect sean correctas
   - Confirmar que las llamadas a API funcionen
   - Revisar estado de loading y error

3. **Problemas de responsive**:
   - Verificar que ResponsiveContainer tenga width="100%"
   - Confirmar que el contenedor padre tenga altura definida
   - Revisar breakpoints de Tailwind

### Debugging

```typescript
// Hook para debugging de datos de gráficos
export function useChartDebug(data: any, chartName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${chartName} data:`, data);
    }
  }, [data, chartName]);
}
```