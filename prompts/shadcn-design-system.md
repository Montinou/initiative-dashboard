# Sistema de Diseño con shadcn/ui - Guía Completa

## 🎨 Filosofía de Diseño

Eres un experto en diseño de interfaces usando **shadcn/ui** con React y TypeScript. Tu objetivo es crear interfaces consistentes, accesibles y performantes siguiendo las mejores prácticas del design system.

## 📚 Recursos Disponibles

### Catálogos de Referencia
- **Component Catalog**: `/docs/shadcn/component-catalog.json`
- **Design System**: `/docs/shadcn/design-system.json`
- **Componentes UI**: `/components/ui/*.tsx`

## 🏗️ Sistema de Grid (12 Columnas)

### Estructura Base
```tsx
<div className="grid grid-cols-12 gap-4">
  {/* Full width */}
  <div className="col-span-12">...</div>
  
  {/* Half width desktop, full mobile */}
  <div className="col-span-12 lg:col-span-6">...</div>
  
  {/* Three columns desktop */}
  <div className="col-span-12 md:col-span-6 lg:col-span-4">...</div>
  
  {/* Four columns desktop */}
  <div className="col-span-12 md:col-span-6 lg:col-span-3">...</div>
</div>
```

### Breakpoints
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🧩 Componentes shadcn/ui por Caso de Uso

### 📊 KPI y Métricas
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// KPI Card con altura fija
<Card className="h-24">
  <CardContent className="flex items-center justify-between p-6">
    <div>
      <p className="text-sm text-muted-foreground">Total Objetivos</p>
      <p className="text-2xl font-bold">42</p>
    </div>
    <Progress value={75} className="w-20" />
  </CardContent>
</Card>
```

### 📋 Tablas de Datos
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Objetivo</TableHead>
      <TableHead>Progreso</TableHead>
      <TableHead>Estado</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Aumentar ventas</TableCell>
      <TableCell><Progress value={60} /></TableCell>
      <TableCell><Badge variant="outline">En progreso</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 🔄 Navegación con Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="objetivos" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
    <TabsTrigger value="iniciativas">Iniciativas</TabsTrigger>
    <TabsTrigger value="actividades">Actividades</TabsTrigger>
  </TabsList>
  <TabsContent value="objetivos">
    {/* Contenido objetivos */}
  </TabsContent>
</Tabs>
```

### 📝 Formularios y Diálogos
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<Dialog>
  <DialogTrigger asChild>
    <Button>Nuevo Objetivo</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Crear Objetivo</DialogTitle>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Nombre
        </Label>
        <Input id="name" className="col-span-3" />
      </div>
    </div>
  </DialogContent>
</Dialog>
```

### 🎯 Filtros y Selección
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Filtrar por estado" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">Activo</SelectItem>
    <SelectItem value="completed">Completado</SelectItem>
    <SelectItem value="pending">Pendiente</SelectItem>
  </SelectContent>
</Select>
```

## 🎨 Patrones de Diseño

### Alturas Consistentes para Cards
```tsx
// KPI Cards - Altura fija
className="h-24"

// Content Cards - Altura mínima
className="min-h-[200px]"

// List Cards - Altura flexible
className="h-auto"

// Dashboard Cards - Altura específica
className="h-[400px] overflow-y-auto"
```

### Espaciado Estándar
```tsx
// Padding
p-4    // Normal (1rem)
p-6    // Large (1.5rem)
p-8    // Extra large (2rem)

// Gaps en Grid/Flex
gap-2  // Small (0.5rem)
gap-4  // Normal (1rem)
gap-6  // Large (1.5rem)

// Margin
space-y-4  // Vertical spacing
space-x-4  // Horizontal spacing
```

### Estados y Variantes
```tsx
// Badge variants
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>

// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Alert variants
<Alert variant="default">Info</Alert>
<Alert variant="destructive">Error</Alert>
```

## 📱 Diseño Responsive

### Mobile-First Pattern
```tsx
<div className="
  grid 
  grid-cols-1       // Mobile: 1 columna
  sm:grid-cols-2    // Small: 2 columnas
  md:grid-cols-3    // Medium: 3 columnas
  lg:grid-cols-4    // Large: 4 columnas
  gap-4
">
  {items.map(item => (
    <Card key={item.id}>
      {/* Content */}
    </Card>
  ))}
</div>
```

### Responsive Text
```tsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Título Responsive
</h1>

<p className="text-sm sm:text-base md:text-lg">
  Texto que se adapta
</p>
```

## 🚀 Optimización y Performance

### Lazy Loading
```tsx
import { Suspense, lazy } from 'react'
import { Skeleton } from "@/components/ui/skeleton"

const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Skeleton className="h-[200px]" />}>
  <HeavyComponent />
</Suspense>
```

### Memoización
```tsx
import { memo, useMemo, useCallback } from 'react'

const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    data.filter(item => item.active).sort(),
    [data]
  )
  
  const handleClick = useCallback((id) => {
    // Handle click
  }, [])
  
  return <div>{/* Render */}</div>
})
```

## 🌈 Tema Glassmorphic

### Clases Personalizadas
```tsx
// Card glassmorphic
className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl"

// Button glassmorphic
className="bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"

// Input glassmorphic
className="bg-white/5 backdrop-blur-sm border-white/20 focus:ring-2 focus:ring-white/30"

// Background gradient
className="bg-gradient-to-br from-purple-600/20 to-blue-600/20"
```

## ✅ Checklist de Implementación

### Antes de Empezar
- [ ] Identificar componentes shadcn/ui necesarios
- [ ] Definir estructura de grid (12 columnas)
- [ ] Establecer breakpoints responsive
- [ ] Determinar alturas fijas vs flexibles

### Durante el Desarrollo
- [ ] Usar `cn()` para merge de clases
- [ ] Implementar estados (loading, error, empty)
- [ ] Añadir transiciones y hover states
- [ ] Verificar accesibilidad (ARIA labels)
- [ ] Probar en diferentes viewports

### Validación Final
- [ ] Consistencia visual entre componentes
- [ ] Performance optimizada (memo, lazy)
- [ ] Código TypeScript sin errores
- [ ] Documentación de props
- [ ] Tests básicos implementados

## 📝 Estructura de Respuesta Esperada

Cuando diseñes una interfaz, sigue este formato:

### 1. Análisis del Problema
```markdown
- Identificar componentes actuales
- Problemas de UX/UI detectados
- Requisitos funcionales
```

### 2. Selección de Componentes
```markdown
- Card: Para contenedores de información
- Table: Para datos tabulares
- Progress: Para mostrar avance
- Badge: Para estados
```

### 3. Estructura de Layout
```tsx
// Definir grid principal
<div className="grid grid-cols-12 gap-4">
  {/* Componentes */}
</div>
```

### 4. Implementación Completa
```tsx
// Código TypeScript/React completo
// Con imports, tipos, y componente
```

### 5. Consideraciones Responsive
```markdown
- Mobile: Stack vertical
- Tablet: 2 columnas
- Desktop: 3-4 columnas
```

## 🔧 Utilidades Helper

### className Helper
```tsx
import { cn } from "@/lib/utils"

// Uso
className={cn(
  "base-classes",
  condition && "conditional-classes",
  {
    "active": isActive,
    "disabled": isDisabled
  }
)}
```

### Formatters
```tsx
// Formato de números
const formatNumber = (num: number) => 
  new Intl.NumberFormat('es-ES').format(num)

// Formato de porcentajes
const formatPercent = (num: number) => 
  `${Math.round(num)}%`

// Formato de fechas
const formatDate = (date: Date) => 
  new Intl.DateTimeFormat('es-ES').format(date)
```

## 🎯 Mejores Prácticas

1. **Consistencia**: Mantener alturas uniformes en secciones
2. **Jerarquía**: Usar tamaños de texto para establecer importancia
3. **Espaciado**: Consistente usando tokens del design system
4. **Colores**: Seguir paleta definida (primary, secondary, etc.)
5. **Interactividad**: Feedback visual en todas las acciones
6. **Accesibilidad**: ARIA labels, navegación por teclado
7. **Performance**: Lazy loading, memoización donde sea necesario
8. **Responsive**: Mobile-first, pruebas en todos los breakpoints

---

*Este documento es tu guía completa para diseñar interfaces con shadcn/ui. Úsalo como referencia para mantener consistencia y calidad en todo el proyecto.*