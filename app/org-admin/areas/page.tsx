'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Target,
  UserCog,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

interface Area {
  id: string
  name: string
  description: string | null
  manager?: {
    id: string
    full_name: string
    email: string
  } | null
  users_count?: number
  objectives_count?: number
  is_active: boolean
  created_at: string
}

export default function AreasManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [managingUsersArea, setManagingUsersArea] = useState<Area | null>(null)
  const [locale, setLocale] = useState('es')

  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  // Fetch areas data
  const { data: areasData, error, isLoading, mutate } = useSWR('/api/org-admin/areas', fetcher)
  const areas: Area[] = areasData?.areas || []

  // Filter areas based on search query
  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.manager?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveArea = async (data: any) => {
    try {
      const url = editingArea ? `/api/org-admin/areas/${editingArea.id}` : '/api/org-admin/areas'
      const method = editingArea ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) throw new Error('Failed to save area')
      
      await mutate() // Refresh data
      setEditingArea(null)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error saving area:', error)
      throw error
    }
  }

  const handleDeleteArea = async (area: Area) => {
    if (!confirm('Are you sure you want to delete this area?')) return
    
    try {
      const response = await fetch(`/api/org-admin/areas/${area.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to delete area')
      
      await mutate() // Refresh data
    } catch (error) {
      console.error('Error deleting area:', error)
      alert('Failed to delete area')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <Alert className="bg-red-500/10 border-red-500/20 text-red-200 backdrop-blur-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {locale === 'es' ? 'Error al cargar áreas: ' : 'Failed to load areas: '}{error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="space-y-6 backdrop-blur-xl">
        {/* Header */}
        <div className="backdrop-blur-xl bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {locale === 'es' ? 'Gestión de Áreas' : 'Areas Management'}
              </h1>
              <p className="text-gray-400">
                {locale === 'es' ? 'Administra áreas organizacionales y asignaciones' : 'Manage organizational areas and assignments'}
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {locale === 'es' ? 'Crear Área' : 'Create Area'}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder={locale === 'es' 
                    ? 'Buscar áreas por nombre, descripción o gerente...'
                    : 'Search areas by name, description, or manager...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-white border-white/20">
                  {locale === 'es' ? 'Todas las Áreas' : 'All Areas'} ({areas.length})
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-400/20">
                  {locale === 'es' ? 'Activas' : 'Active'} ({areas.filter(a => a.is_active).length})
                </Badge>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/20">
                  {locale === 'es' ? 'Sin Gerente' : 'No Manager'} ({areas.filter(a => !a.manager).length})
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Areas Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          <span className="ml-2 text-white/60">Loading areas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAreas.map((area) => (
            <Card key={area.id} className="backdrop-blur-xl bg-gray-900/50 border border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <CardTitle className="text-white text-lg">{area.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {area.is_active ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem 
                          onClick={() => setEditingArea(area)}
                          className="text-white hover:bg-slate-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {locale === 'es' ? 'Editar Área' : 'Edit Area'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setManagingUsersArea(area)}
                          className="text-white hover:bg-slate-700"
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          {locale === 'es' ? 'Gestionar Usuarios' : 'Manage Users'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteArea(area)}
                          className="text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {locale === 'es' ? 'Eliminar Área' : 'Delete Area'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-white/60 text-sm mt-2">{area.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{locale === 'es' ? 'Gerente:' : 'Manager:'}</span>
                    <span className="text-white text-sm">
                      {area.manager ? area.manager.full_name : (locale === 'es' ? 'No asignado' : 'Unassigned')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{locale === 'es' ? 'Tamaño del Equipo:' : 'Team Size:'}</span>
                    <div className="flex items-center gap-1 text-purple-400">
                      <Users className="w-4 h-4" />
                      <span>{area.users_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{locale === 'es' ? 'Objetivos:' : 'Objectives:'}</span>
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Target className="w-4 h-4" />
                      <span>{area.objectives_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{locale === 'es' ? 'Estado:' : 'Status:'}</span>
                    <Badge 
                      variant={area.is_active ? "default" : "secondary"}
                      className={area.is_active ? "bg-green-600" : "bg-red-600"}
                    >
                      {area.is_active 
                        ? (locale === 'es' ? 'Activa' : 'Active') 
                        : (locale === 'es' ? 'Inactiva' : 'Inactive')
                      }
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {!isLoading && filteredAreas.length === 0 && (
          <div className="text-center py-12 backdrop-blur-xl bg-gray-900/50 border border-white/10 rounded-lg">
            <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {locale === 'es' ? 'No se encontraron áreas' : 'No areas found'}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? (locale === 'es' ? 'No hay áreas que coincidan con tus criterios de búsqueda.' : 'No areas match your search criteria.') 
                : (locale === 'es' ? 'Crea tu primera área para comenzar.' : 'Create your first area to get started.')
              }
            </p>
          </div>
        )}

        {/* Modals would go here if they exist */}
        {/* <AreaFormModal /> */}
        {/* <AreaUsersModal /> */}
      </div>
    </div>
  )
}