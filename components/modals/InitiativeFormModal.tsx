'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Lightbulb, AlertCircle, Loader2, CalendarIcon, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { useTranslations, useLocale } from 'next-intl'

interface Initiative {
  id?: string
  title: string
  description?: string
  area_id: string
  progress?: number
  start_date?: string | null
  due_date?: string | null
  completion_date?: string | null
  status?: 'planning' | 'in_progress' | 'completed' | 'on_hold'
}

interface Activity {
  title: string
  description?: string
  assigned_to?: string | null
}

interface Area {
  id: string
  name: string
}

interface Objective {
  id: string
  title: string
  area_id?: string | null
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
  area_id?: string | null
}

interface InitiativeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Initiative, objectiveIds?: string[], activities?: Activity[]) => Promise<void>
  initiative?: Initiative | null
  defaultAreaId?: string | null
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())

export default function InitiativeFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initiative,
  defaultAreaId 
}: InitiativeFormModalProps) {
  const t = useTranslations('forms')
  const tDashboard = useTranslations('dashboard')
  const locale = useLocale()
  const [formData, setFormData] = useState<Initiative>({
    title: '',
    description: '',
    area_id: defaultAreaId || '',
    progress: 0,
    start_date: null,
    due_date: null,
    completion_date: null,
    status: 'planning'
  })
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [newActivity, setNewActivity] = useState<Activity>({ title: '', description: '' })
  const [startDate, setStartDate] = useState<Date>()
  const [dueDate, setDueDate] = useState<Date>()
  const [completionDate, setCompletionDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showActivityForm, setShowActivityForm] = useState(false)

  // Fetch data
  const { data: areasData } = useSWR('/api/areas', fetcher)
  const { data: objectivesData } = useSWR('/api/objectives', fetcher)
  const { data: usersData } = useSWR('/api/org-admin/users', fetcher)
  
  const areas: Area[] = areasData?.areas || []
  const objectives: Objective[] = objectivesData?.objectives || []
  const users: User[] = usersData?.users || []

  // Filter objectives by selected area
  const filteredObjectives = objectives.filter(obj => 
    !formData.area_id || !obj.area_id || obj.area_id === formData.area_id
  )

  // Filter users by selected area (for activity assignment)
  const filteredUsers = users.filter(user => 
    !formData.area_id || !user.area_id || user.area_id === formData.area_id
  )

  useEffect(() => {
    if (initiative) {
      setFormData({
        title: initiative.title,
        description: initiative.description || '',
        area_id: initiative.area_id,
        progress: initiative.progress || 0,
        start_date: initiative.start_date || null,
        due_date: initiative.due_date || null,
        completion_date: initiative.completion_date || null,
        status: initiative.status || 'planning'
      })
      if (initiative.start_date) setStartDate(new Date(initiative.start_date))
      if (initiative.due_date) setDueDate(new Date(initiative.due_date))
      if (initiative.completion_date) setCompletionDate(new Date(initiative.completion_date))
    } else {
      setFormData({
        title: '',
        description: '',
        area_id: defaultAreaId || '',
        progress: 0,
        start_date: null,
        due_date: null,
        completion_date: null,
        status: 'planning'
      })
      setStartDate(undefined)
      setDueDate(undefined)
      setCompletionDate(undefined)
      setSelectedObjectives([])
      setActivities([])
    }
    setError(null)
  }, [initiative, isOpen, defaultAreaId])

  const handleAddActivity = () => {
    if (newActivity.title.trim()) {
      setActivities([...activities, { ...newActivity }])
      setNewActivity({ title: '', description: '' })
      setShowActivityForm(false)
    }
  }

  const handleRemoveActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError(locale === 'es' ? 'El título de la iniciativa es requerido' : 'Initiative title is required')
      return
    }

    if (!formData.area_id) {
      setError(locale === 'es' ? 'El área es requerida' : 'Area is required')
      return
    }

    setLoading(true)
    try {
      await onSave(formData, selectedObjectives, activities)
      onClose()
    } catch (err: any) {
      setError(err.message || (locale === 'es' ? 'Error al guardar la iniciativa' : 'Error saving initiative'))
    } finally {
      setLoading(false)
    }
  }

  const title = initiative 
    ? (locale === 'es' ? 'Editar Iniciativa' : 'Edit Initiative')
    : (locale === 'es' ? 'Crear Nueva Iniciativa' : 'Create New Initiative')

  const statusOptions = [
    { value: 'planning', label: locale === 'es' ? 'Planificación' : 'Planning', color: 'text-muted-foreground' },
    { value: 'in_progress', label: locale === 'es' ? 'En Progreso' : 'In Progress', color: 'text-warning' },
    { value: 'completed', label: locale === 'es' ? 'Completada' : 'Completed', color: 'text-primary' },
    { value: 'on_hold', label: locale === 'es' ? 'En Pausa' : 'On Hold', color: 'text-muted-foreground' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">
              {locale === 'es' ? 'Título de la Iniciativa' : 'Initiative Title'} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={locale === 'es' ? 'ej. Lanzamiento de nuevo producto' : 'e.g. New product launch'}
              className=""
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {locale === 'es' ? 'Descripción' : 'Description'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={locale === 'es' 
                ? 'Describe la iniciativa y sus entregables...' 
                : 'Describe the initiative and deliverables...'
              }
              className="bg-white/5 border-white/10 text-white min-h-[80px]"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">
                {locale === 'es' ? 'Área' : 'Area'} *
              </Label>
              <Select
                value={formData.area_id}
                onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={locale === 'es' ? 'Seleccionar área' : 'Select area'} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                {locale === 'es' ? 'Estado' : 'Status'}
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'planning' | 'in_progress' | 'completed' | 'on_hold') => 
                  setFormData({ ...formData, status: value })
                }
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {locale === 'es' ? 'Progreso' : 'Progress'}: {formData.progress}%
            </Label>
            <Slider
              value={[formData.progress || 0]}
              onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
              max={100}
              step={5}
              disabled={loading}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>
                {locale === 'es' ? 'Fecha Inicio' : 'Start Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, 'PP', { locale: locale === 'es' ? es : undefined })
                    ) : (
                      <span className="text-xs">{locale === 'es' ? 'Seleccionar' : 'Select'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(newDate) => {
                      setStartDate(newDate)
                      setFormData({ 
                        ...formData, 
                        start_date: newDate ? format(newDate, 'yyyy-MM-dd') : null 
                      })
                    }}
                    initialFocus
                    className=""
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>
                {locale === 'es' ? 'Fecha Límite' : 'Due Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? (
                      format(dueDate, 'PP', { locale: locale === 'es' ? es : undefined })
                    ) : (
                      <span className="text-xs">{locale === 'es' ? 'Seleccionar' : 'Select'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(newDate) => {
                      setDueDate(newDate)
                      setFormData({ 
                        ...formData, 
                        due_date: newDate ? format(newDate, 'yyyy-MM-dd') : null 
                      })
                    }}
                    initialFocus
                    className=""
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>
                {locale === 'es' ? 'Completada' : 'Completed'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !completionDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completionDate ? (
                      format(completionDate, 'PP', { locale: locale === 'es' ? es : undefined })
                    ) : (
                      <span className="text-xs">{locale === 'es' ? 'Seleccionar' : 'Select'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={completionDate}
                    onSelect={(newDate) => {
                      setCompletionDate(newDate)
                      setFormData({ 
                        ...formData, 
                        completion_date: newDate ? format(newDate, 'yyyy-MM-dd') : null 
                      })
                    }}
                    initialFocus
                    className=""
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {filteredObjectives.length > 0 && (
            <div className="space-y-2">
              <Label>
                {locale === 'es' ? 'Vincular a Objetivos' : 'Link to Objectives'}
              </Label>
              <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                {filteredObjectives.map((objective) => (
                  <label 
                    key={objective.id} 
                    className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer rounded"
                  >
                    <input
                      type="checkbox"
                      value={objective.id}
                      checked={selectedObjectives.includes(objective.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedObjectives([...selectedObjectives, objective.id])
                        } else {
                          setSelectedObjectives(selectedObjectives.filter(id => id !== objective.id))
                        }
                      }}
                      disabled={loading}
                      className="rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="text-sm">{objective.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!initiative && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {locale === 'es' ? 'Actividades' : 'Activities'}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowActivityForm(true)}
                  variant="default"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {locale === 'es' ? 'Añadir' : 'Add'}
                </Button>
              </div>

              {showActivityForm && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <Input
                    placeholder={locale === 'es' ? 'Título de la actividad' : 'Activity title'}
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    className=""
                  />
                  <Textarea
                    placeholder={locale === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="bg-white/5 border-white/10 text-white min-h-[60px]"
                  />
                  <Select
                    value={newActivity.assigned_to || 'none'}
                    onValueChange={(value) => setNewActivity({ 
                      ...newActivity, 
                      assigned_to: value === 'none' ? null : value 
                    })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder={locale === 'es' ? 'Asignar a' : 'Assign to'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-muted-foreground">
                        {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
                      </SelectItem>
                      {filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddActivity}
                      variant="default"
                    >
                      {locale === 'es' ? 'Añadir' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowActivityForm(false)
                        setNewActivity({ title: '', description: '' })
                      }}
                      className="hover:bg-accent"
                    >
                      {locale === 'es' ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              )}

              {activities.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{activity.title}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveActivity(index)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="hover:bg-accent"
          >
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="default"
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