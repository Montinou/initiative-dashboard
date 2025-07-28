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
  Upload,
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
import Link from "next/link"
import { OKRDashboard } from "@/components/okr-dashboard"
import { InitiativeDashboard } from "@/components/InitiativeDashboard"
import { canAccessOKRs, hasPermission, type RolePermissions } from "@/lib/role-utils"
import { useAuth, useUserRole, useTenantId } from "@/lib/auth-context"
import { getThemeFromDomain, getThemeFromTenant, generateThemeCSS, getTenantIdFromDomain } from "@/lib/theme-config"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useOKRDepartments } from "@/hooks/useOKRData"
import { useProgressDistribution, useStatusDistribution, useAreaComparison } from "@/hooks/useChartData"

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

// Mock data removed - now using real Supabase data through InitiativeDashboard

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
  const { profile, loading: authLoading } = useAuth();
  const userRole = useUserRole();
  const tenantId = useTenantId();
  const { userProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState("overview")
  const [theme, setTheme] = useState<any>(null)

  // Get theme based on user's organization (tenant_id) after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (tenantId) {
        console.log('🎨 Dashboard: User authenticated - using tenant-based theme for:', tenantId);
        console.log('👤 Dashboard: User profile tenant_id:', tenantId);
        
        // Use user's actual tenant ID for theme (this respects user's organization)
        const userTheme = getThemeFromTenant(tenantId);
        setTheme(userTheme);
        document.title = `${userTheme.companyName} - Dashboard`;
        
        console.log('✅ Dashboard: Applied user organization theme:', userTheme.companyName);
      } else {
        console.log('🎨 Dashboard: No user profile loaded - using domain fallback theme');
        console.log('🌐 Dashboard: Current hostname:', window.location.hostname);
        
        // Fallback to domain-based theme if user profile isn't loaded yet
        // This ensures API calls work even during profile load
        const actualTenantId = getTenantIdFromDomain(window.location.hostname);
        const fallbackTheme = getThemeFromTenant(actualTenantId);
        
        setTheme(fallbackTheme);
        document.title = `${fallbackTheme.companyName} - Dashboard`;
        
        console.log('⚠️ Dashboard: Using domain fallback theme:', fallbackTheme.companyName);
        console.log('🔧 Dashboard: Fallback tenant ID:', actualTenantId);
      }
    }
  }, [tenantId, profile]);
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
  
  // Fetch data from APIs
  const { data: okrData, loading: okrLoading, error: okrError } = useOKRDepartments();
  const { data: progressData, loading: progressLoading } = useProgressDistribution();
  const { data: statusDistData, loading: statusLoading } = useStatusDistribution();
  const { data: areaCompData, loading: areaLoading } = useAreaComparison();
  
  // Use API data for other dashboard components
  const areas = okrData?.areas || [];
  const chartData = progressData || [];
  const statusData = statusDistData || [];

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <InitiativeDashboard />
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

  const renderUpload = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <Link href="/upload">
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer group max-w-2xl mx-auto">
            <CardContent className="p-0">
              <div className="flex flex-col items-center space-y-6">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-400/20 border border-white/20 group-hover:from-purple-500/30 group-hover:to-cyan-400/30 transition-all duration-300">
                  <Upload className="h-12 w-12 text-purple-300 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-cyan-300 transition-all duration-300">
                    Gestión de Archivos Excel
                  </h2>
                  <p className="text-purple-200/80 group-hover:text-purple-200 transition-colors duration-300 max-w-md">
                    Sube y procesa plantillas del "Tablero de Gestión y Seguimiento" para integrar datos automáticamente
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                  <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                    <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <h4 className="font-medium text-white text-sm mb-1">Descarga Plantilla</h4>
                    <p className="text-xs text-purple-200/70">Formato estándar con validaciones</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                    <Upload className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                    <h4 className="font-medium text-white text-sm mb-1">Sube Archivos</h4>
                    <p className="text-xs text-purple-200/70">Excel, CSV hasta 10MB</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                    <BarChart3 className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                    <h4 className="font-medium text-white text-sm mb-1">Integración</h4>
                    <p className="text-xs text-purple-200/70">Datos automáticos en dashboard</p>
                  </div>
                </div>

                <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500 text-white px-8 py-2 rounded-lg font-medium transition-all duration-300 group-hover:scale-105">
                  Ir a Gestión de Archivos
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-green-500/20 border border-green-500/30">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Formatos Soportados</h3>
                <p className="text-purple-200/80 text-sm">Excel (.xlsx, .xls) y CSV</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-500/20 border border-blue-500/30">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Validación Automática</h3>
                <p className="text-purple-200/80 text-sm">Verifica datos y estructura</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-purple-500/20 border border-purple-500/30">
                <Settings className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Procesamiento Seguro</h3>
                <p className="text-purple-200/80 text-sm">Cifrado y validación completa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderOKRs = () => {
    if (!userRole || !tenantId) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/20">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-300 mb-2">Authentication Required</h3>
              <p className="text-yellow-200">
                Please log in to access OKR tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    if (!canAccessOKRs(userRole)) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="backdrop-blur-xl bg-red-500/10 border border-red-500/20">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-300 mb-2">Access Denied</h3>
              <p className="text-red-200">
                Your role ({userRole}) does not have permission to view OKR tracking.
              </p>
              <p className="text-red-200/70 text-sm mt-2">
                Contact your administrator if you need access to this feature.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <OKRDashboard 
          userRole={userRole}
        />
      </div>
    );
  }

  const allTabs = [
    { id: "overview", label: "Resumen General", icon: LayoutDashboard },
    { id: "initiatives", label: "Iniciativas", icon: Zap },
    { id: "areas", label: "Por Área", icon: Users },
    { id: "okrs", label: "OKRs Departamentos", icon: Target, requiredPermission: "viewOKRs" },
    { id: "analytics", label: "Analíticas", icon: BarChart3 },
    { id: "upload", label: "Gestión Archivos", icon: Upload },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.requiredPermission && userRole) {
      return hasPermission(userRole, tab.requiredPermission as keyof RolePermissions);
    }
    return true;
  });

  // Show loading state while authentication or data is being fetched
  const isLoading = authLoading || okrLoading || progressLoading || statusLoading || areaLoading;
  
  // Debug loading states
  console.log('Loading states:', {
    authLoading,
    okrLoading,
    progressLoading,
    statusLoading,
    areaLoading,
    isLoading
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-purple-200/80 mb-4">
              Please log in to access the dashboard.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth/login'}
              className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles + (theme ? generateThemeCSS(theme) : '') }} />
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
                {theme ? `${theme.companyName} Dashboard` : 'Dashboard Ejecutivo'}
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
            <ProfileDropdown userProfile={userProfile || undefined} />
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
          {activeTab === "okrs" && renderOKRs()}
          {activeTab === "analytics" && renderAnalytics()}
          {activeTab === "upload" && renderUpload()}
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
