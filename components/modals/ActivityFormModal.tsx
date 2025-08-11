'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckSquare, AlertCircle, Loader2, User } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import useSWR from 'swr'

interface Activity {
  id?: string
  initiative_id?: string
  title: string
  description?: string
  is_completed?: boolean
  assigned_to?: string | null
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  area_id?: string | null
}

interface Initiative {
  id: string
  title: string
  area_id: string
}

interface ActivityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Activity) => Promise<void>
  activity?: Activity | null
  initiativeId?: string | null
  locale?: string
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())

export default function ActivityFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  activity, 
  initiativeId,
  locale = 'es' 
}: ActivityFormModalProps) {
  const [formData, setFormData] = useState<Activity>({
    title: '',
    description: '',
    is_completed: false,
    assigned_to: null,
    initiative_id: initiativeId || undefined
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch users and initiatives
  const { data: usersData } = useSWR('/api/org-admin/users', fetcher)
  const { data: initiativesData } = useSWR('/api/initiatives', fetcher)
  
  const users: User[] = usersData?.users || []
  const initiatives: Initiative[] = initiativesData?.initiatives || []

  // Find selected initiative to filter users by area
  const selectedInitiative = initiatives.find(i => i.id === formData.initiative_id)
  const filteredUsers = selectedInitiative 
    ? users.filter(u => !u.area_id || u.area_id === selectedInitiative.area_id)
    : users

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title,
        description: activity.description || '',
        is_completed: activity.is_completed || false,
        assigned_to: activity.assigned_to || null,
        initiative_id: activity.initiative_id
      })
    } else {
      setFormData({
        title: '',
        description: '',
        is_completed: false,
        assigned_to: null,
        initiative_id: initiativeId || undefined
      })
    }
    setError(null)
  }, [activity, initiativeId, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError(locale === 'es' ? 'El título de la actividad es requerido' : 'Activity title is required')
      return
    }

    if (!formData.initiative_id) {
      setError(locale === 'es' ? 'La iniciativa es requerida' : 'Initiative is required')
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || (locale === 'es' ? 'Error al guardar la actividad' : 'Error saving activity'))
    } finally {
      setLoading(false)
    }
  }

  const title = activity 
    ? (locale === 'es' ? 'Editar Actividad' : 'Edit Activity')
    : (locale === 'es' ? 'Crear Nueva Actividad' : 'Create New Activity')

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CheckSquare className="h-5 w-5 text-green-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">
              {locale === 'es' ? 'Título de la Actividad' : 'Activity Title'} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={locale === 'es' ? 'ej. Revisar propuesta de diseño' : 'e.g. Review design proposal'}
              className="bg-white/5 border-white/10 text-white"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              {locale === 'es' ? 'Descripción' : 'Description'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={locale === 'es' 
                ? 'Describe los detalles de la actividad...' 
                : 'Describe the activity details...'
              }
              className="bg-white/5 border-white/10 text-white min-h-[80px]"
              disabled={loading}
            />
          </div>

          {!initiativeId && (
            <div className="space-y-2">
              <Label htmlFor="initiative" className="text-white">
                {locale === 'es' ? 'Iniciativa' : 'Initiative'} *
              </Label>
              <Select
                value={formData.initiative_id || ''}
                onValueChange={(value) => setFormData({ ...formData, initiative_id: value })}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={locale === 'es' ? 'Seleccionar iniciativa' : 'Select initiative'} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {initiatives.map((initiative) => (
                    <SelectItem key={initiative.id} value={initiative.id} className="text-white">
                      {initiative.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="assigned" className="text-white">
              {locale === 'es' ? 'Asignado a' : 'Assigned to'}
            </Label>
            <Select
              value={formData.assigned_to || 'none'}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                assigned_to: value === 'none' ? null : value 
              })}
              disabled={loading}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={locale === 'es' ? 'Seleccionar usuario' : 'Select user'} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="none" className="text-gray-400">
                  {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
                </SelectItem>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="text-white">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{user.full_name || user.email}</span>
                      <span className="text-xs text-gray-400">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedInitiative && (
              <p className="text-xs text-gray-400">
                {locale === 'es' 
                  ? `Mostrando usuarios del área: ${selectedInitiative.area_id}`
                  : `Showing users from area: ${selectedInitiative.area_id}`
                }
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="completed" className="text-white">
              {locale === 'es' ? 'Actividad Completada' : 'Activity Completed'}
            </Label>
            <Switch
              id="completed"
              checked={formData.is_completed}
              onCheckedChange={(checked) => setFormData({ ...formData, is_completed: checked })}
              disabled={loading}
            />
          </div>

          {formData.is_completed && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-200">
                {locale === 'es' 
                  ? 'Esta actividad será marcada como completada'
                  : 'This activity will be marked as completed'
                }
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading 
              ? (locale === 'es' ? 'Guardando...' : 'Saving...')
              : (locale === 'es' ? 'Guardar' : 'Save')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}