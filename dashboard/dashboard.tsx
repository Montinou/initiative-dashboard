"use client"

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
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
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Send,
  Bot,
  Minimize2,
  Maximize2,
  Upload,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
// Link import removed - navigation now handled by DashboardNavigation
import { OKRDashboard } from "@/components/okr-dashboard"
import { TemplateDownload } from '@/components/template-download'
import { FileUploadComponent } from '@/components/file-upload'
import { InitiativeDashboard } from "@/components/InitiativeDashboard"
import { canAccessOKRs, hasPermission, type RolePermissions } from "@/lib/role-utils"
import { useAuth, useUserRole, useTenantId } from "@/lib/auth-context"
import { getThemeFromDomain, getThemeFromTenant, generateThemeCSS, getTenantIdFromDomain } from "@/lib/theme-config"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useOKRDepartments } from "@/hooks/useOKRData"
import { useProgressDistribution, useStatusDistribution, useAreaComparison } from "@/hooks/useChartData"
import { useInitiativesSummary } from "@/hooks/useInitiativesSummary"
import { useTrendData } from "@/hooks/useTrendData"
import { useAdvancedMetrics, type ComparisonPeriod } from "@/hooks/useAdvancedMetrics"
import { DashboardNavigation } from "@/components/DashboardNavigation"
import { FilterContainer } from "@/components/filters/FilterContainer"
import { useFilters, type FilterState } from "@/hooks/useFilters"
import { applyFiltersToData, getFilterSummary } from "@/lib/utils/filterUtils"

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
    background: linear-gradient(135deg, hsl(var(--primary) / 0.8), hsl(var(--secondary) / 0.8)) !important;
    border-radius: 12px !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 4px 16px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px hsl(var(--secondary) / 0.3) !important;
  }
  
  .glassmorphic-scrollbar::-webkit-scrollbar-thumb:hover,
  .glassmorphic-scrollbar *::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, hsl(var(--primary) / 0.8), hsl(var(--secondary) / 0.8)) !important;
    box-shadow: 0 4px 16px hsl(var(--primary) / 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
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

// Enhanced animated counter with loading state support
const AnimatedCounter = ({ value, duration = 2000, isLoading = false }: { value: number; duration?: number; isLoading?: boolean }) => {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isLoading) return
    
    setIsAnimating(true)
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }
    requestAnimationFrame(animate)
  }, [value, duration, isLoading])

  if (isLoading) {
    return <div className="w-12 h-6 bg-white/20 rounded animate-pulse"></div>
  }

  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
      {count}
    </span>
  )
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
interface PremiumDashboardProps {
  initialTab?: string
}

export default function PremiumDashboard({ initialTab = "overview" }: PremiumDashboardProps) {
  const { profile, loading: authLoading } = useAuth();
  const userRole = useUserRole();
  const tenantId = useTenantId();
  const { userProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState(initialTab)
  const [theme, setTheme] = useState<any>(null)
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('month')
  const [filteredData, setFilteredData] = useState<any>(null)
  
  // Loading states for seamless experience
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [dataLoadProgress, setDataLoadProgress] = useState(0)
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  
  // Upload state
  const [uploadResults, setUploadResults] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Initialize filters
  const { filters, updateFilters, resetFilters, hasActiveFilters, applyFilters } = useFilters({
    onFiltersChange: (newFilters: FilterState) => {
      console.log('🔍 Dashboard: Filters changed:', newFilters)
      // The filtered data will be applied in each render function
    }
  })

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
  
  // Fetch data from APIs
  const { data: okrData, loading: okrLoading, error: okrError } = useOKRDepartments();
  const { data: progressData, loading: progressLoading } = useProgressDistribution(filters);
  const { data: statusDistData, loading: statusLoading } = useStatusDistribution(filters);
  const { data: areaCompData, loading: areaLoading } = useAreaComparison(filters);
  const { initiatives: summaryInitiatives, metrics: summaryMetrics, loading: summaryLoading } = useInitiativesSummary(filters);
  
  // Combined loading states for smooth experience
  const isDataLoading = okrLoading || progressLoading || statusLoading || areaLoading || summaryLoading;
  const hasData = okrData || progressData || statusDistData || areaCompData || summaryMetrics;

  // Initialize chat with dynamic welcome message based on real data
  useEffect(() => {
    if (chatMessages.length === 0 && !summaryLoading && summaryMetrics) {
      const welcomeMessage = {
        id: 1,
        type: "bot",
        message: `¡Hola! Soy tu asistente de IA. Veo que tienes ${summaryMetrics.total || 0} iniciativas activas. ¿En qué puedo ayudarte con tus objetivos estratégicos?`,
        timestamp: new Date(),
      };
      setChatMessages([welcomeMessage]);
    }
  }, [summaryLoading, summaryMetrics, chatMessages.length]);
  const { data: trendData, loading: trendLoading } = useTrendData(tenantId, filters);
  const { metrics: advancedMetrics, loading: metricsLoading } = useAdvancedMetrics(tenantId, comparisonPeriod, filters);
  
  // Track overall loading progress
  useEffect(() => {
    const loadingStates = [okrLoading, progressLoading, statusLoading, areaLoading, summaryLoading, trendLoading, metricsLoading];
    const totalStates = loadingStates.length;
    const completedStates = loadingStates.filter(state => !state).length;
    const progress = Math.round((completedStates / totalStates) * 100);
    
    setDataLoadProgress(progress);
    
    if (progress === 100 && isInitialLoad) {
      setTimeout(() => setIsInitialLoad(false), 300);
    }
  }, [okrLoading, progressLoading, statusLoading, areaLoading, summaryLoading, trendLoading, metricsLoading, isInitialLoad]);
  
  // Use API data for other dashboard components
  const areas = okrData?.departments || [];
  
  // Transform area data for bar chart
  const chartData = areas.map((area) => ({
    area: area.name,
    progreso: Math.round(area.progress || 0),
    meta: 100, // Target is always 100%
  }));
  
  const statusData = (statusDistData || []).map(item => ({
    ...item,
    value: item.count, // Add value property for PieChart
    name: item.status, // Add name property for display
  }));
  
  // Debug logging for KPI data sources
  console.log('📊 Dashboard KPI Debug:', {
    summaryMetrics,
    summaryLoading,
    areas: areas.length,
    statusData: statusData.length,
    hasFilters: hasActiveFilters(),
    filters
  });

  // Calculate KPIs from real data - prioritize summary metrics when available
  const totalInitiatives = summaryMetrics?.total || areas.reduce((sum: number, area: any) => sum + (area.metrics?.totalInitiatives || area.initiative_count || 0), 0);
  const completedInitiatives = summaryMetrics?.completed || statusData.find(s => s.status === 'completed')?.count || 0;
  const avgProgress = summaryMetrics?.averageProgress || (areas.length > 0 
    ? Math.round(areas.reduce((sum: number, area: any) => sum + (area.metrics?.averageProgress || Number(area.progress) || 0), 0) / areas.length)
    : 0);
  const activeAreas = areas.filter((area: any) => (area.metrics?.totalInitiatives || area.initiative_count || 0) > 0).length;
  
  // Real trend data from database - no more mock data
  
  // Enhanced KPIs with more detailed metrics from the summary view
  const kpis = [
    {
      title: "Total Iniciativas",
      value: totalInitiatives,
      change: summaryMetrics?.overdue ? `${summaryMetrics.overdue} vencidas` : "Total de iniciativas activas",
      icon: Zap,
      color: "from-primary to-secondary",
    },
    {
      title: "Completadas",
      value: completedInitiatives,
      change: totalInitiatives > 0 ? `${Math.round((completedInitiatives / totalInitiatives) * 100)}% completado` : "Sin iniciativas completadas",
      icon: CheckCircle2,
      color: theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? "from-fema-blue to-fema-yellow" : theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? "from-siga-green to-siga-yellow" : "from-green-500 to-teal-500",
    },
    {
      title: "Progreso Promedio",
      value: avgProgress,
      change: summaryMetrics?.inProgress ? `${summaryMetrics.inProgress} en progreso` : "Progreso promedio actual",
      icon: TrendingUp,
      color: theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? "from-fema-yellow to-fema-blue" : theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? "from-siga-yellow to-siga-green" : "from-blue-500 to-cyan-500",
    },
    {
      title: "Subtareas Totales",
      value: summaryMetrics?.totalSubtasks || 0,
      change: summaryMetrics?.completedSubtasks ? `${summaryMetrics.completedSubtasks} completadas` : `${areas.length} áreas`,
      icon: Users,
      color: theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? "from-fema-blue-400 to-fema-yellow" : theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? "from-siga-green-400 to-siga-yellow" : "from-orange-500 to-yellow-500",
    },
  ];

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

  const renderOverview = () => {
    // Progressive loading: show layout immediately, fade in data as it loads
    const isDataLoading = summaryLoading || okrLoading;

    // Check if we have any data
    const hasData = areas.length > 0 || totalInitiatives > 0 || !summaryLoading;

    if (!hasData && !summaryLoading) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
            <CardContent className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white">Welcome to {theme?.companyName || 'Your'} Dashboard</h3>
              <p className="text-white/70 max-w-md mx-auto">
                No initiatives or areas have been created yet. Start by adding areas and initiatives to track your organization's progress.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button 
                  onClick={() => setActiveTab("areas")}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
                >
                  Create Areas
                </Button>
                <Button 
                  onClick={() => setActiveTab("initiatives")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Add Initiatives
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
    <div className="space-y-8">
      {/* KPIs - Responsivo with seamless loading */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.title}
            className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 group ${
              isDataLoading ? 'opacity-70 animate-pulse' : 'opacity-100'
            }`}
            style={{ 
              animationDelay: `${index * 100}ms`,
              transform: isDataLoading ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.5s ease-out'
            }}
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${kpi.color} bg-opacity-20 transition-all duration-300 ${isDataLoading ? 'opacity-50' : 'opacity-100'}`}>
                  <kpi.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
                    <AnimatedCounter value={kpi.value} isLoading={isDataLoading} />
                  </div>
                  <p className={`text-xs text-foreground/70 transition-all duration-300 ${isDataLoading ? 'opacity-50' : 'opacity-100'}`}>
                    {isDataLoading ? '...' : kpi.change}
                  </p>
                </div>
              </div>
              <h3 className="text-sm font-medium text-foreground/80">{kpi.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de barras */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.01] transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-700">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              Progreso por Área
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative">
            {(progressLoading || areaLoading || !chartData?.length) ? (
              <div className="flex items-center justify-center h-[300px] relative">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-lg"></div>
                <div className="relative z-10 text-center">
                  <div 
                    className="w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-3"
                    style={{
                      borderColor: theme?.colors?.primary ? `${theme.colors.primary}30` : 'rgba(139, 92, 246, 0.3)',
                      borderTopColor: theme?.colors?.primary || '#8b5cf6'
                    }}
                  ></div>
                  <span className="text-white/70 text-sm">
                    {progressLoading || areaLoading ? 'Loading chart data...' : 'No data available'}
                  </span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="area" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                  <Bar 
                    dataKey="progreso" 
                    fill="url(#barGradient)" 
                    radius={[4, 4, 0, 0]}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Bar 
                    dataKey="meta" 
                    fill="rgba(255,255,255,0.1)" 
                    radius={[4, 4, 0, 0]}
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme?.colors?.primary || "#8b5cf6"} />
                      <stop offset="50%" stopColor={theme?.colors?.secondary || "#3b82f6"} />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de dona */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.01] transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '100ms' }}>
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              Estado de Iniciativas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative">
            {(statusLoading || !statusData?.length) ? (
              <div className="flex items-center justify-center h-[200px] relative">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-lg"></div>
                <div className="relative z-10 text-center">
                  <div 
                    className="w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-3"
                    style={{
                      borderColor: theme?.colors?.primary ? `${theme.colors.primary}30` : 'rgba(139, 92, 246, 0.3)',
                      borderTopColor: theme?.colors?.primary || '#8b5cf6'
                    }}
                  ></div>
                  <span className="text-white/70 text-sm">
                    {statusLoading ? 'Loading status data...' : 'No status data available'}
                  </span>
                </div>
              </div>
            ) : (
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
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 animate-in fade-in slide-in-from-right duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground/80">{item.name}</span>
                      <span className="text-sm font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
  }

  const renderInitiatives = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <InitiativeDashboard />
    </div>
  )

  const renderByArea = () => {
    const isAreaDataLoading = okrLoading || areaLoading;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAreaDataLoading ? (
            // Loading skeleton for areas
            Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={`skeleton-${index}`}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-white/20 rounded mb-2 w-3/4"></div>
                      <div className="h-4 bg-white/10 rounded w-full"></div>
                    </div>
                    <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full"></div>
                    <div className="flex-1 ml-4">
                      <div className="h-4 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 bg-white/10 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-white/10 rounded"></div>
                    <div className="h-3 bg-white/10 rounded w-4/5"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            areas.map((area, index: number) => {
          // Create area display data with proper defaults
          const areaData = {
            id: area.id || `area-${index}`,
            name: area.name || 'Unnamed Area',
            objective: area.description || 'No objective defined',
            status: area.progress >= 80 ? '🟢' : area.progress >= 50 ? '🟡' : '🔴',
            progress: Math.round(area.progress || 0),
            leader: area.manager?.full_name || area.manager?.email || 'To be assigned',
            initiatives: area.metrics?.totalInitiatives || 0
          };

          return (
            <Card
              key={areaData.id}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent mb-1">
                      {areaData.name}
                    </h3>
                    <p className="text-sm text-foreground/70">{areaData.objective}</p>
                  </div>
                  <div className="text-2xl">{areaData.status}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <CircularProgress value={areaData.progress} size={60} />
                  <div className="text-right">
                    <div className="text-sm text-foreground/80">Líder</div>
                    <div className="font-medium text-white">{areaData.leader}</div>
                    <div className="text-xs text-foreground/60 mt-1">{areaData.initiatives} iniciativas</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">Progreso General</span>
                    <span className="text-white font-medium">{areaData.progress}%</span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2 backdrop-blur-sm">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-1000"
                      style={{ width: `${areaData.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            );
            })
          )}
        </div>
      </div>
    );
  }

  const renderAnalytics = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tendencias temporales */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.005] transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-700">
        <CardHeader className="p-0 mb-6">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            Tendencias de Iniciativas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(trendLoading || !trendData?.length) ? (
            <div className="flex items-center justify-center h-[300px] text-white/60 relative">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-lg"></div>
              <div className="relative z-10 text-center">
                <div 
                  className="w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-3"
                  style={{
                    borderColor: theme?.colors?.primary ? `${theme.colors.primary}30` : 'rgba(139, 92, 246, 0.3)',
                    borderTopColor: theme?.colors?.primary || '#8b5cf6'
                  }}
                ></div>
                <span className="text-white/70 text-sm">
                  {trendLoading ? 'Loading trends...' : 'No trend data available'}
                </span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} />
                <Area 
                  type="monotone" 
                  dataKey="completadas" 
                  stackId="1" 
                  stroke={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? '#00539F' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? '#00A651' :
                    '#10b981'
                  }
                  fill={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'rgba(0, 83, 159, 0.3)' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'rgba(0, 166, 81, 0.3)' :
                    'rgba(16, 185, 129, 0.3)'
                  }
                  animationBegin={0}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Area 
                  type="monotone" 
                  dataKey="enProgreso" 
                  stackId="1" 
                  stroke={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? '#FFC72C' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? '#FDC300' :
                    '#3b82f6'
                  }
                  fill={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'rgba(255, 199, 44, 0.3)' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'rgba(253, 195, 0, 0.3)' :
                    'rgba(59, 130, 246, 0.3)'
                  }
                  animationBegin={300}
                  animationDuration={1300}
                  animationEasing="ease-out"
                />
                <Area 
                  type="monotone" 
                  dataKey="enRiesgo" 
                  stackId="1" 
                  stroke={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? '#F0F2F5' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? '#F8F9FA' :
                    '#f59e0b'
                  }
                  fill={
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'rgba(240, 242, 245, 0.3)' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'rgba(248, 249, 250, 0.3)' :
                    'rgba(245, 158, 11, 0.3)'
                  }
                  animationBegin={600}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Métricas Avanzadas</h2>
        <div className="flex space-x-2">
          {(['week', 'month', 'quarter'] as ComparisonPeriod[]).map((period) => (
            <Button
              key={period}
              variant={comparisonPeriod === period ? "default" : "ghost"}
              size="sm"
              onClick={() => setComparisonPeriod(period)}
              className={cn(
                "text-white transition-all duration-200",
                comparisonPeriod === period 
                  ? "bg-white/20 hover:bg-white/30" 
                  : "hover:bg-white/10"
              )}
            >
              {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Trimestre'}
            </Button>
          ))}
        </div>
      </div>

      {/* Métricas avanzadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className={`h-8 w-8 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                'text-green-400'
              }`} />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {!metricsLoading && advancedMetrics ? (
                    <AnimatedCounter value={Math.round(advancedMetrics.successRate.current)} />
                  ) : (
                    <AnimatedCounter value={0} />
                  )}%
                </div>
                {!metricsLoading && advancedMetrics && Math.abs(advancedMetrics.successRate.changePercent) > 0.1 && (
                  <div className={`text-xs flex items-center ${
                    advancedMetrics.successRate.isIncrease ? (
                      theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                      theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                      'text-green-400'
                    ) : 'text-red-400'
                  }`}>
                    {advancedMetrics.successRate.isIncrease ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    {advancedMetrics.successRate.isIncrease ? '+' : ''}{advancedMetrics.successRate.changePercent.toFixed(1)}% vs {
                      comparisonPeriod === 'week' ? 'semana anterior' :
                      comparisonPeriod === 'month' ? 'mes anterior' :
                      'trimestre anterior'
                    }
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-foreground/80">Tasa de Éxito</h3>
            <p className="text-xs text-foreground/60 mt-1">Iniciativas completadas a tiempo</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <Clock className={`h-8 w-8 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
                'text-blue-400'
              }`} />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {!metricsLoading && advancedMetrics ? (
                    <AnimatedCounter value={Math.round(advancedMetrics.averageTimeToComplete.current)} />
                  ) : (
                    <AnimatedCounter value={0} />
                  )}
                </div>
                <div className={`text-xs ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
                  'text-blue-400'
                }`}>días promedio</div>
                {!metricsLoading && advancedMetrics && Math.abs(advancedMetrics.averageTimeToComplete.changePercent) > 0.1 && (
                  <div className={`text-xs flex items-center mt-1 ${
                    !advancedMetrics.averageTimeToComplete.isIncrease ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {!advancedMetrics.averageTimeToComplete.isIncrease ? (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(advancedMetrics.averageTimeToComplete.changePercent).toFixed(1)}% vs anterior
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-foreground/80">Tiempo Promedio</h3>
            <p className="text-xs text-foreground/60 mt-1">Duración de iniciativas</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className={`h-8 w-8 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
                'text-yellow-400'
              }`} />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {!metricsLoading && advancedMetrics ? (
                    <AnimatedCounter value={advancedMetrics.activeAlerts.current} />
                  ) : (
                    <AnimatedCounter value={0} />
                  )}
                </div>
                {!metricsLoading && advancedMetrics && Math.abs(advancedMetrics.activeAlerts.change) > 0 && (
                  <div className={`text-xs flex items-center ${
                    !advancedMetrics.activeAlerts.isIncrease ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {!advancedMetrics.activeAlerts.isIncrease ? (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    )}
                    {!advancedMetrics.activeAlerts.isIncrease ? '' : '+'}{advancedMetrics.activeAlerts.change} vs {
                      comparisonPeriod === 'week' ? 'semana anterior' :
                      comparisonPeriod === 'month' ? 'mes anterior' :
                      'trimestre anterior'
                    }
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-sm font-medium text-foreground/80">Alertas Activas</h3>
            <p className="text-xs text-foreground/60 mt-1">Iniciativas que requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Recomendaciones */}
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
            Recomendaciones del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            <div className={`flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm border ${
              theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-yellow/10 border-fema-yellow/20' :
              theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-yellow/10 border-siga-yellow/20' :
              'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
                'text-yellow-400'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow-300' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow-300' :
                  'text-yellow-300'
                }`}>Atención requerida</p>
                <p className={`text-xs ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow-200/80' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow-200/80' :
                  'text-yellow-200/80'
                }`}>
                  La iniciativa "Sistema de Inventario" está en riesgo. Considere reasignar recursos.
                </p>
              </div>
            </div>
            <div className={`flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm border ${
              theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-blue/10 border-fema-blue/20' :
              theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-green/10 border-siga-green/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <TrendingUp className={`h-5 w-5 mt-0.5 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                'text-blue-400'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue-300' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green-300' :
                  'text-blue-300'
                }`}>Oportunidad de optimización</p>
                <p className={`text-xs ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue-200/80' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green-200/80' :
                  'text-blue-200/80'
                }`}>
                  El área de Marketing está superando objetivos. Considere acelerar iniciativas relacionadas.
                </p>
              </div>
            </div>
            <div className={`flex items-start space-x-3 p-3 rounded-lg backdrop-blur-sm border ${
              theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-blue/10 border-fema-blue/20' :
              theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-green/10 border-siga-green/20' :
              'bg-green-500/10 border-green-500/20'
            }`}>
              <CheckCircle2 className={`h-5 w-5 mt-0.5 ${
                theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                'text-green-400'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue-300' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green-300' :
                  'text-green-300'
                }`}>Buen progreso</p>
                <p className={`text-xs ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue-200/80' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green-200/80' :
                  'text-green-200/80'
                }`}>
                  Las iniciativas de Finanzas están en buen camino para cumplir los objetivos trimestrales.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderUpload = () => {
    const handleUploadComplete = (result: any) => {
      setUploadResults(prev => [...prev, result])
      
      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Success Message */}
        {showSuccess && (
          <div className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="text-green-300 font-medium">
              File uploaded and processed successfully!
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Download Section */}
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-blue/20' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-green/20' :
                  'bg-primary/20'
                }`}>
                  <div className={`h-6 w-6 ${
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                    'text-primary'
                  }`}>📋</div>
                </div>
                Download Templates
              </CardTitle>
              <p className="text-foreground/70 text-sm">
                Get standardized Excel templates for data upload
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <TemplateDownload />
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-yellow/20' :
                  theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-yellow/20' :
                  'bg-secondary/20'
                }`}>
                  <Upload className={`h-6 w-6 ${
                    theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
                    theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
                    'text-secondary'
                  }`} />
                </div>
                Upload Files
              </CardTitle>
              <p className="text-foreground/70 text-sm">
                Upload your Excel files for processing and integration
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <FileUploadComponent onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {uploadResults.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-accent" />
                Processing Results
              </CardTitle>
              <p className="text-foreground/70 text-sm">
                Review the results of your file uploads
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-4">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      result.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {result.fileName || `Upload ${index + 1}`}
                      </span>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          result.success
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {result.message && (
                      <p className="text-foreground/80 text-sm">
                        {result.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              Upload Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="h-8 w-8 text-primary mb-2">📊</div>
                <h3 className="font-semibold text-white mb-1">Multi-Sheet Support</h3>
                <p className="text-foreground/70 text-sm">Process multiple Excel sheets automatically</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="h-8 w-8 text-accent mb-2">🎯</div>
                <h3 className="font-semibold text-white mb-1">Smart Detection</h3>
                <p className="text-foreground/70 text-sm">Recognizes OKR sheets, summary data, and more</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
                <h3 className="font-semibold text-white mb-1">Validation</h3>
                <p className="text-foreground/70 text-sm">Automatic data validation and error checking</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <BarChart3 className="h-8 w-8 text-secondary mb-2" />
                <h3 className="font-semibold text-white mb-1">Integration</h3>
                <p className="text-foreground/70 text-sm">Direct integration with dashboard analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
    
    // Only pass userRole if it's compatible with OKRDashboard's expected types
    const isCompatibleRole = userRole === 'CEO' || userRole === 'Admin';
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <OKRDashboard 
          userRole={isCompatibleRole ? userRole as 'CEO' | 'Admin' : 'Admin'}
        />
      </div>
    );
  }

  // Tab configuration moved to DashboardNavigation component

  // Show progressive loading - only block on critical auth data
  const isCriticalLoading = authLoading;
  const hasAnyData = summaryInitiatives?.length > 0 || okrData?.length > 0;
  
  if (isCriticalLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-gradient-to-br from-slate-900 via-fema-blue-900 to-slate-900' :
        theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-gradient-to-br from-slate-900 via-siga-green-900 to-slate-900' :
        'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
      }`}>
        <div className="text-center">
          <div 
            className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: theme?.colors?.primary ? `${theme.colors.primary}30` : 'rgba(139, 92, 246, 0.3)',
              borderTopColor: theme?.colors?.primary || '#8b5cf6'
            }}
          ></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 max-w-md">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
            <p className="text-gray-300 mb-4">
              Please log in to access the dashboard.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth/login'}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
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
      <div className="min-h-screen flex">
        {/* Sidebar Navigation */}
        <DashboardNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          userProfile={userProfile}
          theme={theme}
        />

        {/* Main Content Area */}
        <div className={`flex-1 min-h-screen glassmorphic-scrollbar relative ${
          theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-gradient-to-br from-slate-900 via-fema-blue-900 to-slate-900' :
          theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-gradient-to-br from-slate-900 via-siga-green-900 to-slate-900' :
          'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        }`}>
          {/* Enhanced loading system */}
          {isDataLoading && (
            <>
              {/* Subtle progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-50 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300 ease-out" 
                  style={{ 
                    width: `${dataLoadProgress}%`, 
                    background: theme?.colors?.primary && theme?.colors?.secondary 
                      ? `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})` 
                      : 'linear-gradient(to right, #8b5cf6, #06b6d4)',
                    boxShadow: theme?.colors?.primary 
                      ? `0 0 20px ${theme.colors.primary}50` 
                      : '0 0 20px rgba(139, 92, 246, 0.5)'
                  }}
                ></div>
              </div>
              
              {/* Initial load overlay - only shows during first load */}
              {isInitialLoad && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center transition-opacity duration-500">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center max-w-sm mx-4">
                    <div 
                      className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
                      style={{
                        borderColor: theme?.colors?.primary ? `${theme.colors.primary}30` : 'rgba(139, 92, 246, 0.3)',
                        borderTopColor: theme?.colors?.primary || '#8b5cf6'
                      }}
                    ></div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Loading {theme?.companyName || 'Dashboard'}
                    </h3>
                    <p className="text-white/70 text-sm mb-4">
                      Preparing your data...
                    </p>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300 ease-out rounded-full"
                        style={{
                          width: `${dataLoadProgress}%`,
                          background: theme?.colors?.primary && theme?.colors?.secondary 
                            ? `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})` 
                            : 'linear-gradient(to right, #8b5cf6, #06b6d4)'
                        }}
                      ></div>
                    </div>
                    <p className="text-white/50 text-xs mt-2">{dataLoadProgress}% complete</p>
                  </div>
                </div>
              )}
            </>
          )}
          <main className="p-4 lg:p-8 xl:p-10 2xl:p-12 min-h-screen overflow-auto">
            {/* Filter Container - Show on tabs that support filtering */}
            {(activeTab === "overview" || activeTab === "initiatives" || activeTab === "areas" || activeTab === "analytics") && (
              <div className="mb-6">
                <FilterContainer 
                  onFiltersChange={updateFilters}
                  className="animate-in fade-in slide-in-from-top-4 duration-500"
                />
                {hasActiveFilters() && (
                  <div className="mt-2 text-sm text-white/70 italic">
                    {getFilterSummary(filters)}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "overview" && renderOverview()}
            {activeTab === "initiatives" && renderInitiatives()}
            {activeTab === "areas" && renderByArea()}
            {activeTab === "okrs" && renderOKRs()}
            {activeTab === "analytics" && renderAnalytics()}
            {activeTab === "upload" && renderUpload()}
          </main>

          {/* Bot de IA Flotante */}
          {!chatOpen && (
          <Button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 shadow-2xl hover:shadow-primary/25 transition-all duration-300 z-40"
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
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Asistente IA</h3>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'bg-fema-blue' :
                      theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'bg-siga-green' :
                      'bg-green-400'
                    }`}></div>
                    <span className={`text-xs ${
                      theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
                      theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
                      'text-green-400'
                    }`}>En línea</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-white/10 p-1"
                  onClick={() => setChatMinimized(!chatMinimized)}
                >
                  {chatMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:bg-white/10 p-1"
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
                            ? "bg-gradient-to-r from-primary to-secondary text-white"
                            : "bg-white/20 text-foreground border border-white/20"
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
                      className="flex-1 backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-foreground/50 text-sm"
                    />
                    <Button
                      onClick={sendMessage}
                      size="sm"
                      className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 p-2"
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
      </div>
    </>
  )
}
