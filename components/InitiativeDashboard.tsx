"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
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
} from "recharts"
import {
  Plus,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  MoreHorizontal,
  Filter
} from "lucide-react"
import { useInitiatives } from "@/hooks/useInitiatives"
import { useAreas } from "@/hooks/useAreas"
import { InitiativeModal } from "./InitiativeModal"
import { useTenantId } from "@/lib/auth-context"
import { getThemeFromTenant, getThemeFromDomain, generateThemeCSS, type CompanyTheme } from "@/lib/theme-config"
import type { InitiativeWithRelations } from "@/lib/types/database"

// Dynamic colors based on theme
const getThemeColors = (theme: CompanyTheme | null) => {
  if (!theme) return ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
  
  return [
    theme.colors.primary,
    theme.colors.secondary,
    '#10b981', // Green for completed
    '#f59e0b', // Orange for in progress  
    '#ef4444', // Red for at risk
    theme.colors.accent
  ]
}

export function InitiativeDashboard() {
  const { initiatives, loading, error } = useInitiatives()
  const { areas } = useAreas()
  const tenantId = useTenantId()
  const [selectedArea, setSelectedArea] = useState<string>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingInitiative, setEditingInitiative] = useState<InitiativeWithRelations | null>(null)
  const [theme, setTheme] = useState<CompanyTheme | null>(null)

  // Get theme based on user's organization (tenant_id) after login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (tenantId) {
        // Use organization-based theme after login
        const currentTheme = getThemeFromTenant(tenantId);
        setTheme(currentTheme);
      } else {
        // Fallback to domain-based theme if no tenant
        const currentTheme = getThemeFromDomain(window.location.hostname);
        setTheme(currentTheme);
      }
    }
  }, [tenantId])

  // Filter initiatives by area
  const filteredInitiatives = initiatives.filter(initiative => 
    selectedArea === "all" || initiative.area_id === selectedArea
  )

  // Calculate metrics
  const totalInitiatives = filteredInitiatives.length
  const completedInitiatives = filteredInitiatives.filter(i => i.progress === 100).length
  const inProgressInitiatives = filteredInitiatives.filter(i => i.progress > 0 && i.progress < 100).length
  const notStartedInitiatives = filteredInitiatives.filter(i => i.progress === 0).length
  const averageProgress = totalInitiatives > 0 
    ? Math.round(filteredInitiatives.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives)
    : 0

  // Chart data for progress distribution with theme colors
  const themeColors = getThemeColors(theme)
  const progressData = [
    { name: 'Completed', value: completedInitiatives, color: themeColors[2] },
    { name: 'In Progress', value: inProgressInitiatives, color: themeColors[3] },
    { name: 'Not Started', value: notStartedInitiatives, color: themeColors[4] }
  ]

  // Chart data for area distribution
  const areaData = areas.map(area => {
    const areaInitiatives = initiatives.filter(i => i.area_id === area.id)
    const avgProgress = areaInitiatives.length > 0
      ? Math.round(areaInitiatives.reduce((sum, i) => sum + i.progress, 0) / areaInitiatives.length)
      : 0
    
    return {
      name: area.name,
      initiatives: areaInitiatives.length,
      progress: avgProgress
    }
  })

  const handleEditInitiative = (initiative: InitiativeWithRelations) => {
    setEditingInitiative(initiative)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingInitiative(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">Error loading initiatives: {error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Inject theme CSS */}
      {theme && <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />}
      
    <div className="space-y-6">
      {/* Header with filters and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {theme ? `${theme.companyName} Initiatives` : 'Initiative Dashboard'}
          </h2>
          <p className="text-muted-foreground">Track and manage your strategic initiatives</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="w-[200px] bg-input border-border text-foreground">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by area" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Areas</SelectItem>
              {areas.filter(area => area.id && area.name).map(area => (
                <SelectItem key={area.id} value={area.id || `area-${Math.random()}`}>{area.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setModalOpen(true)}
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Initiative
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Initiatives</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{totalInitiatives}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {areas.length} areas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{completedInitiatives}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalInitiatives > 0 ? Math.round((completedInitiatives / totalInitiatives) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{inProgressInitiatives}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active initiatives
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{averageProgress}%</div>
            <Progress value={averageProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Progress Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Progress by Area</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Initiatives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInitiatives.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No initiatives found</p>
                <Button 
                  onClick={() => setModalOpen(true)} 
                  variant="default"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Initiative
                </Button>
              </div>
            ) : (
              filteredInitiatives.map((initiative) => (
                <Card key={initiative.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-card-foreground">{initiative.title}</h3>
                          {initiative.area && (
                            <Badge variant="secondary">
                              {initiative.area.name}
                            </Badge>
                          )}
                          <Badge 
                            variant={initiative.progress === 100 ? "default" : initiative.progress > 0 ? "secondary" : "outline"}
                          >
                            {initiative.progress}% Complete
                          </Badge>
                        </div>
                        {initiative.description && (
                          <p className="text-muted-foreground text-sm mb-3">{initiative.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{initiative.completed_activities || 0}/{initiative.activity_count || 0} activities completed</span>
                          <span>Created {new Date(initiative.created_at).toLocaleDateString()}</span>
                        </div>
                        <Progress value={initiative.progress} className="mt-3" />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditInitiative(initiative)}
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initiative Modal */}
      <InitiativeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onClose={handleCloseModal}
        initiative={editingInitiative}
      />
    </div>
    </>
  )
}