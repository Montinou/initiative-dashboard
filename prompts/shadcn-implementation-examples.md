# shadcn/ui Implementation Examples

## 📊 Complete Dashboard Example

```tsx
// app/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Users, Target, Activity } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Card className="h-24">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Objetivos</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Card className="h-24">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Progreso Total</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">68%</p>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <Progress value={68} className="w-20" />
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Card className="h-24">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Iniciativas Activas</p>
                <p className="text-2xl font-bold">42</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 sm:col-span-6 lg:col-span-3">
          <Card className="h-24">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Miembros del Equipo</p>
                <p className="text-2xl font-bold">128</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            <SelectItem value="sales">Ventas</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="product">Producto</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="q1">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="q1">Q1 2025</SelectItem>
            <SelectItem value="q2">Q2 2025</SelectItem>
            <SelectItem value="q3">Q3 2025</SelectItem>
            <SelectItem value="q4">Q4 2025</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline">Aplicar Filtros</Button>
        <Button className="ml-auto">Nuevo Objetivo</Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="objectives" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="objectives">Objetivos</TabsTrigger>
          <TabsTrigger value="initiatives">Iniciativas</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
        </TabsList>
        
        <TabsContent value="objectives" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Objective Cards */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="col-span-12 md:col-span-6 lg:col-span-4">
                <Card className="min-h-[200px]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        Aumentar Revenue Q1
                      </CardTitle>
                      <Badge variant="outline">En progreso</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Incrementar los ingresos en un 25% comparado con Q4 2024
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span className="font-medium">72%</span>
                      </div>
                      <Progress value={72} />
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">5 iniciativas</Badge>
                      <Badge variant="secondary">12 actividades</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="initiatives">
          <Card>
            <CardHeader>
              <CardTitle>Iniciativas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Iniciativa</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        Campaña de Marketing Digital
                      </TableCell>
                      <TableCell>Marketing</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={65} className="w-20" />
                          <span className="text-sm">65%</span>
                        </div>
                      </TableCell>
                      <TableCell>31/03/2025</TableCell>
                      <TableCell>
                        <Badge variant="outline">En progreso</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activities">
          <div className="grid grid-cols-12 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="col-span-12 md:col-span-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Revisar propuesta de cliente</p>
                        <p className="text-sm text-muted-foreground">
                          Asignado a: Juan Pérez
                        </p>
                      </div>
                      <Badge variant={i % 2 === 0 ? "default" : "secondary"}>
                        {i % 2 === 0 ? "Completado" : "Pendiente"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## 🎯 Objective Management Component

```tsx
// components/objectives/ObjectiveManager.tsx
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Plus, Edit, Trash } from "lucide-react"

interface Objective {
  id: string
  title: string
  description: string
  area: string
  quarter: string
  progress: number
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  dueDate: Date
  initiatives: number
  activities: number
}

export function ObjectiveManager() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    area: '',
    quarter: '',
    dueDate: new Date()
  })

  const getStatusVariant = (status: Objective['status']) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'planning': return 'outline'
      case 'overdue': return 'destructive'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Objetivos Estratégicos</h2>
          <p className="text-muted-foreground">
            Gestiona y monitorea los objetivos de tu organización
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Objetivo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="area" className="text-right">
                  Área
                </Label>
                <Select value={formData.area} onValueChange={(value) => setFormData({...formData, area: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Ventas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="operations">Operaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quarter" className="text-right">
                  Trimestre
                </Label>
                <Select value={formData.quarter} onValueChange={(value) => setFormData({...formData, quarter: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="q1">Q1 2025</SelectItem>
                    <SelectItem value="q2">Q2 2025</SelectItem>
                    <SelectItem value="q3">Q3 2025</SelectItem>
                    <SelectItem value="q4">Q4 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">
                  Fecha Límite
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? (
                        format(formData.dueDate, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => date && setFormData({...formData, dueDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                // Handle save
                setIsCreateOpen(false)
              }}>
                Crear Objetivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Objectives Grid */}
      <div className="grid grid-cols-12 gap-6">
        {objectives.length === 0 ? (
          <div className="col-span-12">
            <Card className="min-h-[400px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <Target className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">No hay objetivos creados</h3>
                  <p className="text-muted-foreground">
                    Comienza creando tu primer objetivo estratégico
                  </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Objetivo
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          objectives.map((objective) => (
            <div key={objective.id} className="col-span-12 md:col-span-6 lg:col-span-4">
              <Card className="min-h-[250px] hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {objective.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {objective.area}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {objective.quarter}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(objective.status)}>
                      {objective.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {objective.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span className="font-medium">{objective.progress}%</span>
                    </div>
                    <Progress 
                      value={objective.progress} 
                      className={cn("h-2", getProgressColor(objective.progress))}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div className="flex gap-3">
                      <span className="text-muted-foreground">
                        {objective.initiatives} iniciativas
                      </span>
                      <span className="text-muted-foreground">
                        {objective.activities} actividades
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Vence: {format(objective.dueDate, "dd/MM/yyyy")}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

## 📈 Analytics Dashboard

```tsx
// components/analytics/AnalyticsDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

const data = [
  { month: 'Ene', objetivos: 12, completados: 8 },
  { month: 'Feb', objetivos: 15, completados: 11 },
  { month: 'Mar', objetivos: 18, completados: 14 },
  { month: 'Abr', objetivos: 20, completados: 16 },
]

const pieData = [
  { name: 'Completado', value: 45, color: '#10b981' },
  { name: 'En Progreso', value: 30, color: '#3b82f6' },
  { name: 'Pendiente', value: 25, color: '#ef4444' },
]

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa de Completitud
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">73.5%</div>
              <Progress value={73.5} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                +12.3% vs mes anterior
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Objetivos en Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <div className="flex gap-1 mt-2">
                <Badge variant="destructive" className="text-xs">Alta prioridad</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Requieren atención inmediata
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Promedio de Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <div className="flex gap-2 mt-2">
                <div className="h-2 w-full bg-gray-200 rounded">
                  <div className="h-2 w-[68%] bg-blue-500 rounded" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Todas las áreas combinadas
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-12 md:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Actividades Semanales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">87 completadas</Badge>
                <Badge variant="outline" className="text-xs">55 pendientes</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Últimos 7 días
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="distribution">Distribución</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <Card>
                <CardHeader>
                  <CardTitle>Progreso Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="objetivos" fill="#8b5cf6" />
                      <Bar dataKey="completados" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <div className="col-span-12 lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Estado Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## 🎯 Key Takeaways

1. **Always use 12-column grid** for main layouts
2. **Fixed heights for KPI cards** (h-24)
3. **Minimum heights for content cards** (min-h-[200px])
4. **Consistent spacing** with gap-4 or space-y-4
5. **Responsive design** with col-span breakpoints
6. **Loading states** with Skeleton components
7. **Empty states** with helpful messages
8. **Error handling** with Alert components
9. **Accessibility** with proper ARIA labels
10. **Performance** with React.memo and lazy loading

---

*Use these complete examples as templates for implementing new features with shadcn/ui components.*