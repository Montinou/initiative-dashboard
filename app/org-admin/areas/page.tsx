'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
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
import AreaFormModal from '@/components/modals/AreaFormModal'
import { useTranslations } from 'next-intl'

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
  const { toast } = useToast()
  const t = useTranslations('org-admin.areas')
  const tCommon = useTranslations('common')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [managingUsersArea, setManagingUsersArea] = useState<Area | null>(null)

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
    if (!confirm(t('confirmDelete', { name: area.name }))) return
    
    try {
      const response = await fetch(`/api/org-admin/areas/${area.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to delete area')
      
      await mutate() // Refresh data
      toast({
        title: t('deleteSuccess.title'),
        description: t('deleteSuccess.description'),
      })
    } catch (error) {
      console.error('Error deleting area:', error)
      toast({
        title: tCommon('error'),
        description: t('deleteError'),
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <Alert className="bg-red-500/10 border-red-500/20 text-red-200 backdrop-blur-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('loadError', { error: error.message })}
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
                {t('title')}
              </h1>
              <p className="text-gray-400">
                {t('description')}
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {t('createArea')}
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
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-white border-white/20">
                  {t('filters.allAreas', { count: areas.length })}
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-400/20">
                  {t('filters.active', { count: areas.filter(a => a.is_active).length })}
                </Badge>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/20">
                  {t('filters.noManager', { count: areas.filter(a => !a.manager).length })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Areas Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          <span className="ml-2 text-white/60">{t('loading')}</span>
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
                          {t('actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setManagingUsersArea(area)}
                          className="text-white hover:bg-slate-700"
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          {t('actions.manageUsers')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteArea(area)}
                          className="text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('actions.delete')}
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
                    <span className="text-white/60">{t('fields.manager')}</span>
                    <span className="text-white text-sm">
                      {area.manager ? area.manager.full_name : t('fields.unassigned')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{t('fields.teamSize')}</span>
                    <div className="flex items-center gap-1 text-purple-400">
                      <Users className="w-4 h-4" />
                      <span>{area.users_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{t('fields.objectives')}</span>
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Target className="w-4 h-4" />
                      <span>{area.objectives_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{t('fields.status')}</span>
                    <Badge 
                      variant={area.is_active ? "default" : "secondary"}
                      className={area.is_active ? "bg-green-600" : "bg-red-600"}
                    >
                      {area.is_active 
                        ? t('status.active') 
                        : t('status.inactive')
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
              {t('empty.title')}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? t('empty.noResults') 
                : t('empty.createFirst')
              }
            </p>
          </div>
        )}

        {/* Modals */}
        <AreaFormModal
          isOpen={showCreateForm || editingArea !== null}
          onClose={() => {
            setShowCreateForm(false)
            setEditingArea(null)
          }}
          onSave={handleSaveArea}
          area={editingArea}
        />
      </div>
    </div>
  )
}