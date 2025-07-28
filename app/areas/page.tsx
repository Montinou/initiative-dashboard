'use client'

import { useState, useEffect } from 'react'
import { RoleNavigation } from "@/components/role-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Target, 
  Plus, 
  ArrowLeft, 
  Search, 
  Edit, 
  Users, 
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from "lucide-react"
import { getThemeFromDomain, generateThemeCSS } from '@/lib/theme-config'
import { ProtectedRoute } from '@/components/protected-route'
import { useAreas } from '@/hooks/useAreas'
import Link from "next/link"

export default function AreasPage() {
  const [theme, setTheme] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    manager_id: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { areas, loading, error: areasError, refetch, createArea } = useAreas({
    search: searchTerm,
    includeStats: true,
    limit: 50
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentTheme = getThemeFromDomain(window.location.hostname)
        setTheme(currentTheme)
      } catch (error) {
        console.error('Theme loading error:', error)
      }
    }
  }, [])

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      await createArea({
        name: createForm.name,
        description: createForm.description || undefined,
        manager_id: createForm.manager_id || undefined
      })
      setSuccess('Area created successfully')
      setCreateForm({
        name: '',
        description: '',
        manager_id: ''
      })
      setIsCreateModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create area')
    } finally {
      setIsCreating(false)
    }
  }

  const filteredAreas = areas.filter(area => {
    if (!area) return false
    
    const matchesSearch = !searchTerm || 
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <ProtectedRoute>
      <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <RoleNavigation />
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Areas Management</h1>
                <p className="text-white/70">Manage organizational areas and departments</p>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Area
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Area</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateArea} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Area Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="bg-slate-700 border-slate-600"
                      placeholder="Enter area name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-slate-700 border-slate-600"
                      placeholder="Brief description of the area"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="border-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isCreating ? 'Creating...' : 'Create Area'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {areasError && (
            <Alert className="border-red-500 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{areasError}</AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search areas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Areas Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Areas ({filteredAreas.length})</h2>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading areas...</p>
              </div>
            ) : filteredAreas.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-16 w-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {areas.length === 0 ? 'No Areas Yet' : 'No Areas Found'}
                  </h3>
                  <p className="text-white/70 mb-4">
                    {areas.length === 0 
                      ? 'Create your first organizational area to get started' 
                      : 'Try adjusting your search criteria'}
                  </p>
                  {areas.length === 0 && (
                    <Button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-600 hover:to-cyan-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Area
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAreas.map((area) => (
                  <Card key={area.id} className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Building2 className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <CardTitle className="text-white text-lg">{area.name}</CardTitle>
                            {area.user_profiles && (
                              <p className="text-sm text-white/70 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {area.user_profiles.full_name || area.user_profiles.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={area.is_active ? 'bg-green-600' : 'bg-red-600'}>
                          {area.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {area.description && (
                          <p className="text-white/80 text-sm">{area.description}</p>
                        )}
                        
                        {area.stats && (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                              <span className="text-white/70">Total</span>
                              <span className="text-white font-medium">{area.stats.total}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                              <span className="text-white/70">Completed</span>
                              <span className="text-green-400 font-medium">{area.stats.completed}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                              <span className="text-white/70">In Progress</span>
                              <span className="text-blue-400 font-medium">{area.stats.in_progress}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                              <span className="text-white/70">Planning</span>
                              <span className="text-yellow-400 font-medium">{area.stats.planning}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                          <div className="text-white/60 text-xs flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(area.created_at)}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                              <BarChart3 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </ProtectedRoute>
  )
}