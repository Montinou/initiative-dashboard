"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Zap,
  Users,
  BarChart3,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Bell,
  Settings,
  User,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Menu,
  X,
  Send,
  Bot,
  Minimize2,
  Maximize2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { cn } from "@/lib/utils"

// Glassmorphism scrollbar styles following the dashboard's design system
const scrollbarStyles = `
  /* High specificity glassmorphic scrollbar */
  .glassmorphic-scrollbar::-webkit-scrollbar,
  .glassmorphic-scrollbar *::-webkit-scrollbar {
    width: 14px !important;
    height: 14px !important;
    display: block !important;
  }
  
  /* Force scrollbar to always show */
  .glassmorphic-scrollbar {
    overflow: auto !important;
    scrollbar-width: thin !important;
  }
  
  .glassmorphic-scrollbar::-webkit-scrollbar-track,
  .glassmorphic-scrollbar *::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.12) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    margin: 1px !important;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.1) !important;
  }
  
  .glassmorphic-scrollbar::-webkit-scrollbar-thumb,
  .glassmorphic-scrollbar *::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.8)) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(6, 182, 212, 0.3) !important;
  }
  
  .glassmorphic-scrollbar::-webkit-scrollbar-thumb:hover,
  .glassmorphic-scrollbar *::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.8)) !important;
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
  }
  
  .glassmorphic-scrollbar::-webkit-scrollbar-corner,
  .glassmorphic-scrollbar *::-webkit-scrollbar-corner {
    background: rgba(255, 255, 255, 0.08) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
  }
  
  /* Global application */
  html::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  
  html::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  
  html::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(6, 182, 212, 0.6));
    border-radius: 10px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
  }
  
  html::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(6, 182, 212, 0.8));
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }
  
  /* Firefox support */
  .glassmorphic-scrollbar,
  html {
    scrollbar-width: thin !important;
    scrollbar-color: rgba(139, 92, 246, 0.6) rgba(255, 255, 255, 0.08) !important;
  }
`

// Datos de muestra
const initiatives = [
  {
    id: 1,
    name: "Transformación Digital",
    leader: "Ana García",
    status: "En Progreso",
    progress: 75,
    priority: "Crítica",
    area: "IT",
    startDate: "2024-01-15",
  },
  {
    id: 2,
    name: "Instalación Inteligente",
    leader: "Carlos López",
    status: "Completada",
    progress: 100,
    priority: "Alta",
    area: "Operaciones",
    startDate: "2024-02-01",
  },
  {
    id: 3,
    name: "Paneles Solares",
    leader: "María Rodríguez",
    status: "En Riesgo",
    progress: 45,
    priority: "Crítica",
    area: "Operaciones",
    startDate: "2024-01-20",
  },
  {
    id: 4,
    name: "CRM Avanzado",
    leader: "José Martín",
    status: "En Progreso",
    progress: 60,
    priority: "Alta",
    area: "Comercial",
    startDate: "2024-02-10",
  },
  {
    id: 5,
    name: "Automatización RH",
    leader: "Laura Sánchez",
    status: "No Iniciada",
    progress: 0,
    priority: "Media",
    area: "RH",
    startDate: "2024-03-01",
  },
  {
    id: 6,
    name: "Dashboard Financiero",
    leader: "Roberto Díaz",
    status: "En Progreso",
    progress: 85,
    priority: "Alta",
    area: "Finanzas",
    startDate: "2024-01-25",
  },
  {
    id: 7,
    name: "Campaña Digital Q2",
    leader: "Elena Vega",
    status: "Completada",
    progress: 100,
    priority: "Media",
    area: "Marketing",
    startDate: "2024-02-15",
  },
  {
    id: 8,
    name: "Optimización Procesos",
    leader: "Miguel Torres",
    status: "En Progreso",
    progress: 30,
    priority: "Baja",
    area: "Operaciones",
    startDate: "2024-02-20",
  },
  {
    id: 9,
    name: "Sistema de Inventario",
    leader: "Carmen Ruiz",
    status: "En Riesgo",
    progress: 20,
    priority: "Crítica",
    area: "Operaciones",
    startDate: "2024-01-30",
  },
  {
    id: 10,
    name: "Plataforma E-learning",
    leader: "David Morales",
    status: "En Progreso",
    progress: 55,
    priority: "Media",
    area: "RH",
    startDate: "2024-02-05",
  },
  {
    id: 11,
    name: "Análisis Predictivo",
    leader: "Isabel Castro",
    status: "No Iniciada",
    progress: 0,
    priority: "Alta",
    area: "IT",
    startDate: "2024-03-15",
  },
]

const areas = [
  {
    name: "Comercial",
    objective: "Incrementar ventas 25%",
    progress: 68,
    leader: "Ana García",
    status: "🎯",
    initiatives: 3,
  },
  {
    name: "Operaciones",
    objective: "Reducir costos 15%",
    progress: 52,
    leader: "Carlos López",
    status: "⚠️",
    initiatives: 4,
  },
  {
    name: "Marketing",
    objective: "Aumentar leads 40%",
    progress: 85,
    leader: "Elena Vega",
    status: "✅",
    initiatives: 2,
  },
  {
    name: "RH",
    objective: "Mejorar retención 20%",
    progress: 35,
    leader: "Laura Sánchez",
    status: "🔄",
    initiatives: 2,
  },
  {
    name: "Finanzas",
    objective: "Optimizar flujo caja",
    progress: 78,
    leader: "Roberto Díaz",
    status: "📈",
    initiatives: 1,
  },
  {
    name: "IT",
    objective: "Modernizar infraestructura",
    progress: 42,
    leader: "Isabel Castro",
    status: "🚀",
    initiatives: 3,
  },
]

const chartData = [
  { area: "Comercial", progreso: 68, meta: 80 },
  { area: "Operaciones", progreso: 52, meta: 70 },
  { area: "Marketing", progreso: 85, meta: 75 },
  { area: "RH", progreso: 35, meta: 60 },
  { area: "Finanzas", progreso: 78, meta: 85 },
  { area: "IT", progreso: 42, meta: 65 },
]

const statusData = [
  { name: "Completadas", value: 2, color: "#10b981" },
  { name: "En Progreso", value: 6, color: "#3b82f6" },
  { name: "En Riesgo", value: 2, color: "#f59e0b" },
  { name: "No Iniciadas", value: 2, color: "#6b7280" },
]

const trendData = [
  { mes: "Ene", completadas: 1, enProgreso: 4, enRiesgo: 1 },
  { mes: "Feb", completadas: 2, enProgreso: 5, enRiesgo: 2 },
  { mes: "Mar", completadas: 2, enProgreso: 6, enRiesgo: 2 },
  { mes: "Abr", completadas: 3, enProgreso: 6, enRiesgo: 1 },
  { mes: "May", completadas: 4, enProgreso: 5, enRiesgo: 1 },
  { mes: "Jun", completadas: 5, enProgreso: 4, enRiesgo: 1 },
]

// Componente contador animado
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{count}</span>
}

// Componente de progreso circular
const CircularProgress = ({ value, size = 80 }: { value: number; size?: number }) => {
  const radius = (size - 8) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${(value / 100) * circumference} ${circumference}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{value}%</span>
      </div>
    </div>
  )
}

// Componente principal del dashboard
export default function PremiumDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: "bot",
      message: "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte con tus iniciativas estratégicas?",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Completada: "backdrop-blur-sm bg-green-500/20 border border-green-500/30 text-green-300",
      "En Progreso": "backdrop-blur-sm bg-blue-500/20 border border-blue-500/30 text-blue-300",
      "En Riesgo": "backdrop-blur-sm bg-yellow-500/20 border border-yellow-500/30 text-yellow-300",
      "No Iniciada": "backdrop-blur-sm bg-gray-500/20 border border-gray-500/30 text-gray-300",
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig["No Iniciada"]
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      Crítica: "backdrop-blur-sm bg-red-500/20 border border-red-500/30 text-red-300",
      Alta: "backdrop-blur-sm bg-orange-500/20 border border-orange-500/30 text-orange-300",
      Media: "backdrop-blur-sm bg-blue-500/20 border border-blue-500/30 text-blue-300",
      Baja: "backdrop-blur-sm bg-gray-500/20 border border-gray-500/30 text-gray-300",
    }
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig["Media"]
  }

  const filteredInitiatives = initiatives.filter((initiative) => {
    const matchesStatus = filterStatus === "all" || initiative.status === filterStatus
    const matchesPriority = filterPriority === "all" || initiative.priority === filterPriority
    const matchesSearch =
      initiative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      initiative.leader.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesPriority && matchesSearch
  })

  const kpis = [
    {
      title: "Total Iniciativas",
      value: initiatives.length,
      icon: Target,
      color: "from-purple-500 to-blue-500",
      change: "+2 este mes",
    },
    {
      title: "En Progreso",
      value: initiatives.filter((i) => i.status === "En Progreso").length,
      icon: Clock,
      color: "from-blue-500 to-cyan-400",
      change: "6 activas",
    },
    {
      title: "Completadas",
      value: initiatives.filter((i) => i.status === "Completada").length,
      icon: CheckCircle2,
      color: "from-green-500 to-emerald-400",
      change: "+1 esta semana",
    },
    {
      title: "Críticas",
      value: initiatives.filter((i) => i.priority === "Crítica").length,
      icon: AlertTriangle,
      color: "from-red-500 to-orange-500",
      change: "Requieren atención",
    },
  ]

  const sendMessage = () => {
    if (!chatInput.trim()) return

    const newMessage = {
      id: chatMessages.length + 1,
      type: "user",
      message: chatInput,
      timestamp: new Date(),
    }

    setChatMessages([...chatMessages, newMessage])
    setChatInput("")

    // Simular respuesta del bot
    setTimeout(() => {
      const botResponse = {
        id: chatMessages.length + 2,
        type: "bot",
        message: getBotResponse(chatInput),
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, botResponse])
    }, 1000)
  }

  const getBotResponse = (input: string) => {
    const lowerInput = input.toLowerCase();
    
    // Contextual responses based on input keywords
    if (lowerInput.includes("progreso") || lowerInput.includes("avance")) {
      return "📊 Progreso general: 68%. Las iniciativas de Marketing (85%) están superando objetivos, mientras que RH (35%) necesita atención inmediata."
    }
    
    if (lowerInput.includes("riesgo") || lowerInput.includes("problema")) {
      return "⚠️ Detecté 2 iniciativas en riesgo: 'Paneles Solares' (45%) y 'Sistema de Inventario' (20%). Recomiendo revisar recursos y cronograma."
    }
    
    if (lowerInput.includes("recomendación") || lowerInput.includes("consejo")) {
      return "💡 Recomendaciones: 1) Reasignar recursos de Marketing a IT, 2) Acelerar 'Dashboard Financiero' (85%), 3) Revisar cronograma de iniciativas críticas."
    }
    
    if (lowerInput.includes("área") || lowerInput.includes("departamento")) {
      return "🏢 Rendimiento por área: Marketing ✅ (85%), Finanzas 📈 (78%), Comercial 🎯 (68%), IT 🚀 (42%), Operaciones ⚠️ (52%), RH 🔄 (35%)"
    }
    
    if (lowerInput.includes("meta") || lowerInput.includes("objetivo")) {
      return "🎯 Metas Q1: Comercial busca +25% ventas (68% progreso), Operaciones -15% costos (52% progreso), Marketing +40% leads (SUPERADO al 85%)"
    }
    
    // Default responses with more variety
    const defaultResponses = [
      "🤖 ¡Hola! Analicé tus datos. ¿Te interesa ver las iniciativas que más atención requieren?",
      "📈 Basándome en tendencias actuales, Marketing está sobresaliendo. ¿Quieres replicar sus estrategias en otras áreas?",
      "🔍 He identificado patrones en tus datos. ¿Te gustaría un análisis predictivo para el próximo trimestre?",
      "⚡ Puedo generar reportes personalizados, analizar KPIs específicos o sugerir optimizaciones. ¿Qué necesitas?",
      "🎯 Tu dashboard muestra 11 iniciativas activas. ¿Quieres que priorice las más críticas para esta semana?"
    ]
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPIs - Responsivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.title}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${kpi.color} bg-opacity-20`}>
                  <kpi.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    <AnimatedCounter value={kpi.value} />
                  </div>
                  <p className="text-xs text-purple-200/70">{kpi.change}</p>
                </div>
              </div>
              <h3 className="text-sm font-medium text-purple-200/80">{kpi.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de barras */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Progreso por Área
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="area" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                <Bar dataKey="progreso" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de dona */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Estado de Iniciativas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-purple-200/80">{item.name}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderInitiatives = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Filtros - Responsivos */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar iniciativas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-purple-200/50"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="backdrop-blur-sm bg-white/10 border-white/20 text-white w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-slate-900/90 border-white/20">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="En Progreso">En Progreso</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
                <SelectItem value="En Riesgo">En Riesgo</SelectItem>
                <SelectItem value="No Iniciada">No Iniciada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="backdrop-blur-sm bg-white/10 border-white/20 text-white w-full sm:w-40">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-slate-900/90 border-white/20">
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabla de iniciativas - Responsiva */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden lg:block">
          <Table>
            <TableHeader className="backdrop-blur-xl bg-white/10 border-b border-white/20">
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-purple-200 font-semibold">Nombre</TableHead>
                <TableHead className="text-purple-200 font-semibold">Líder</TableHead>
                <TableHead className="text-purple-200 font-semibold">Estado</TableHead>
                <TableHead className="text-purple-200 font-semibold">Progreso</TableHead>
                <TableHead className="text-purple-200 font-semibold">Prioridad</TableHead>
                <TableHead className="text-purple-200 font-semibold">Área</TableHead>
                <TableHead className="text-purple-200 font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInitiatives.map((initiative, index) => (
                <TableRow
                  key={initiative.id}
                  className="backdrop-blur-sm hover:bg-white/5 border-b border-white/5 transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="font-medium text-white">{initiative.name}</TableCell>
                  <TableCell className="text-purple-200/80">{initiative.leader}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(initiative.status)}>{initiative.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-white/10 rounded-full h-2 backdrop-blur-sm">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${initiative.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-white font-medium">{initiative.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityBadge(initiative.priority)}>{initiative.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-purple-200/80">{initiative.area}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-purple-200 hover:bg-white/10">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Vista móvil de tarjetas */}
        <div className="lg:hidden p-4 space-y-4 glassmorphic-scrollbar">
          {filteredInitiatives.map((initiative, index) => (
            <Card
              key={initiative.id}
              className="backdrop-blur-sm bg-white/5 border border-white/10 p-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-white text-sm">{initiative.name}</h3>
                  <Button variant="ghost" size="sm" className="text-purple-200 hover:bg-white/10 p-1">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200/80">Líder: {initiative.leader}</span>
                  <span className="text-purple-200/80">{initiative.area}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={cn(getStatusBadge(initiative.status), "text-xs")}>
                    {initiative.status}
                  </Badge>
                  <Badge className={cn(getPriorityBadge(initiative.priority), "text-xs")}>
                    {initiative.priority}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-200/80">Progreso</span>
                    <span className="text-white font-medium">{initiative.progress}%</span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2 backdrop-blur-sm">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${initiative.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )

  const renderByArea = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area, index) => (
          <Card
            key={area.name}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-1">
                    {area.name}
                  </h3>
                  <p className="text-sm text-purple-200/70">{area.objective}</p>
                </div>
                <div className="text-2xl">{area.status}</div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <CircularProgress value={area.progress} size={60} />
                <div className="text-right">
                  <div className="text-sm text-purple-200/80">Líder</div>
                  <div className="font-medium text-white">{area.leader}</div>
                  <div className="text-xs text-purple-200/60 mt-1">{area.initiatives} iniciativas</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200/80">Progreso General</span>
                  <span className="text-white font-medium">{area.progress}%</span>
                </div>
                <div className="bg-white/10 rounded-full h-2 backdrop-blur-sm">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${area.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tendencias temporales */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Tendencias de Iniciativas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="mes" stroke="rgba(255,255,255,0.7)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
              <Area type="monotone" dataKey="completadas" stackId="1" stroke="#10b981" fill="rgba(16, 185, 129, 0.3)" />
              <Area type="monotone" dataKey="enProgreso" stackId="1" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.3)" />
              <Area type="monotone" dataKey="enRiesgo" stackId="1" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.3)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Métricas avanzadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={73} />%
                </div>
                <div className="text-xs text-green-400 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  +5% vs mes anterior
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-purple-200/80">Tasa de Éxito</h3>
            <p className="text-xs text-purple-200/60 mt-1">Iniciativas completadas a tiempo</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-8 w-8 text-blue-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={42} />
                </div>
                <div className="text-xs text-blue-400">días promedio</div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-purple-200/80">Tiempo Promedio</h3>
            <p className="text-xs text-purple-200/60 mt-1">Duración de iniciativas</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  <AnimatedCounter value={3} />
                </div>
                <div className="text-xs text-yellow-400 flex items-center">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  -1 vs semana anterior
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-purple-200/80">Alertas Activas</h3>
            <p className="text-xs text-purple-200/60 mt-1">Iniciativas que requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Recomendaciones */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Recomendaciones del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Atención requerida</p>
                <p className="text-xs text-yellow-200/80">
                  La iniciativa "Sistema de Inventario" está en riesgo. Considere reasignar recursos.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm bg-blue-500/10 border border-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Oportunidad de optimización</p>
                <p className="text-xs text-blue-200/80">
                  El área de Marketing está superando objetivos. Considere acelerar iniciativas relacionadas.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-300">Buen progreso</p>
                <p className="text-xs text-green-200/80">
                  Las iniciativas de Finanzas están en buen camino para cumplir los objetivos trimestrales.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const tabs = [
    { id: "overview", label: "Resumen General", icon: LayoutDashboard },
    { id: "initiatives", label: "Iniciativas", icon: Zap },
    { id: "areas", label: "Por Área", icon: Users },
    { id: "analytics", label: "Analíticas", icon: BarChart3 },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 glassmorphic-scrollbar">
      {/* Header con glassmorphism - Responsivo */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <div className="flex items-center space-x-2 lg:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-purple-200 hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="h-3 w-3 lg:h-5 lg:w-5 text-white" />
              </div>
              <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Dashboard Ejecutivo
              </h1>
            </div>
            <div className="hidden sm:block">
              <Select defaultValue="Q1-2024">
                <SelectTrigger className="backdrop-blur-sm bg-white/10 border-white/20 text-white w-28 lg:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-slate-900/90 border-white/20">
                  <SelectItem value="Q1-2024">Q1 2024</SelectItem>
                  <SelectItem value="Q2-2024">Q2 2024</SelectItem>
                  <SelectItem value="Q3-2024">Q3 2024</SelectItem>
                  <SelectItem value="Q4-2024">Q4 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            <Button variant="ghost" size="sm" className="text-purple-200 hover:bg-white/10">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex text-purple-200 hover:bg-white/10">
              <Settings className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2 backdrop-blur-sm bg-white/10 rounded-full px-2 lg:px-3 py-1">
              <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                <User className="h-2 w-2 lg:h-3 lg:w-3 text-white" />
              </div>
              <span className="text-xs lg:text-sm text-white hidden sm:block">CEO</span>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Overlay para móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar con glassmorphism - Responsivo */}
        <nav
          className={`
          backdrop-blur-xl bg-white/5 border-r border-white/10 w-64 min-h-screen p-4 lg:p-6 
          fixed lg:static top-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h2 className="text-lg font-bold text-white">Menú</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-200 hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white/20 border-b-2 border-purple-400 text-white"
                    : "hover:bg-white/10 text-purple-200"
                }`}
              >
                <tab.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="font-medium text-sm lg:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Contenido principal - Responsivo */}
        <main className={`flex-1 p-4 lg:p-8 transition-all duration-300 ${sidebarOpen ? "lg:ml-0" : ""}`}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "initiatives" && renderInitiatives()}
          {activeTab === "areas" && renderByArea()}
          {activeTab === "analytics" && renderAnalytics()}
        </main>
      </div>
      {/* Bot de IA Flotante */}
      {!chatOpen && (
        <Button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 z-40"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat del Bot de IA */}
      {chatOpen && (
        <div
          className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-40 transition-all duration-300 ${
            chatMinimized ? "h-16" : "h-96"
          }`}
        >
          {/* Header del Chat */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Asistente IA</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">En línea</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-200 hover:bg-white/10 p-1"
                onClick={() => setChatMinimized(!chatMinimized)}
              >
                {chatMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-200 hover:bg-white/10 p-1"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!chatMinimized && (
            <>
              {/* Mensajes del Chat */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-64 glassmorphic-scrollbar">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-purple-500 to-cyan-400 text-white"
                          : "bg-white/20 text-purple-100 border border-white/20"
                      }`}
                    >
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input del Chat */}
              <div className="p-4 border-t border-white/20">
                <div className="flex items-center space-x-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 text-sm"
                  />
                  <Button
                    onClick={sendMessage}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 p-2"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </>
  )
}
