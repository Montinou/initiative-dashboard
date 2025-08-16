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
import { Target, AlertCircle, Loader2, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

interface Objective {
  id?: string
  title: string
  description?: string
  area_id?: string | null
  start_date?: string | null
  end_date?: string | null
  priority?: 'high' | 'medium' | 'low'
  status?: 'planning' | 'in_progress' | 'completed' | 'overdue'
}

interface Area {
  id: string
  name: string
  description?: string
}


interface Initiative {
  id: string
  title: string
  area_id?: string
  progress?: number
  status?: string
}

interface ObjectiveFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Objective, initiativeIds?: string[]) => Promise<void>
  objective?: Objective | null
  locale?: string
  linkedInitiatives?: string[]
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())

export default function ObjectiveFormModal({ isOpen, onClose, onSave, objective, locale = 'es', linkedInitiatives = [] }: ObjectiveFormModalProps) {
  const [formData, setFormData] = useState<Objective>({
    title: '',
    description: '',
    area_id: null,
    start_date: null,
    end_date: null,
    priority: 'medium',
    status: 'planning'
  })
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch areas and initiatives
  const { data: areasData } = useSWR('/api/areas', fetcher)
  const { data: initiativesData } = useSWR('/api/initiatives', fetcher)
  const areas: Area[] = areasData?.areas || []
  const initiatives: Initiative[] = initiativesData?.initiatives || []

  useEffect(() => {
    if (objective) {
      setFormData({
        title: objective.title,
        description: objective.description || '',
        area_id: objective.area_id || null,
        start_date: objective.start_date || null,
        end_date: objective.end_date || null,
        priority: objective.priority || 'medium',
        status: objective.status || 'planning'
      })
      if (objective.start_date) {
        setStartDate(new Date(objective.start_date))
      }
      if (objective.end_date) {
        setEndDate(new Date(objective.end_date))
      }
      setSelectedInitiatives(linkedInitiatives)
    } else {
      setFormData({
        title: '',
        description: '',
        area_id: null,
        start_date: null,
        end_date: null,
        priority: 'medium',
        status: 'planning'
      })
      setStartDate(undefined)
      setEndDate(undefined)
      setSelectedInitiatives([])
    }
    setError(null)
  }, [objective, isOpen, linkedInitiatives])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError(locale === 'es' ? 'El título del objetivo es requerido' : 'Objective title is required')
      return
    }

    setLoading(true)
    try {
      await onSave(formData, selectedInitiatives)
      onClose()
    } catch (err: any) {
      setError(err.message || (locale === 'es' ? 'Error al guardar el objetivo' : 'Error saving objective'))
    } finally {
      setLoading(false)
    }
  }

  const title = objective 
    ? (locale === 'es' ? 'Editar Objetivo' : 'Edit Objective')
    : (locale === 'es' ? 'Crear Nuevo Objetivo' : 'Create New Objective')

  const priorityOptions = [
    { value: 'high', label: locale === 'es' ? 'Alta' : 'High', color: 'text-destructive' },
    { value: 'medium', label: locale === 'es' ? 'Media' : 'Medium', color: 'text-warning' },
    { value: 'low', label: locale === 'es' ? 'Baja' : 'Low', color: 'text-primary' }
  ]

  const statusOptions = [
    { value: 'planning', label: locale === 'es' ? 'Planificación' : 'Planning' },
    { value: 'in_progress', label: locale === 'es' ? 'En Progreso' : 'In Progress' },
    { value: 'completed', label: locale === 'es' ? 'Completado' : 'Completed' },
    { value: 'overdue', label: locale === 'es' ? 'Vencido' : 'Overdue' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
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
              {locale === 'es' ? 'Título del Objetivo' : 'Objective Title'} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={locale === 'es' ? 'ej. Aumentar ventas en 20%' : 'e.g. Increase sales by 20%'}
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
                ? 'Describe el objetivo y sus métricas clave...' 
                : 'Describe the objective and key metrics...'
              }
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">
                {locale === 'es' ? 'Área' : 'Area'}
              </Label>
              <Select
                value={formData.area_id || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  area_id: value === 'none' ? null : value 
                })}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={locale === 'es' ? 'Seleccionar área' : 'Select area'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground">
                    {locale === 'es' ? 'Corporativo' : 'Corporate'}
                  </SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">
                {locale === 'es' ? 'Fecha de Inicio' : 'Start Date'}
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
                      format(startDate, locale === 'es' ? 'PPP' : 'PPP', { locale: locale === 'es' ? es : undefined })
                    ) : (
                      <span>{locale === 'es' ? 'Seleccionar fecha' : 'Pick a date'}</span>
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
              <Label htmlFor="end_date">
                {locale === 'es' ? 'Fecha de Fin' : 'End Date'}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, locale === 'es' ? 'PPP' : 'PPP', { locale: locale === 'es' ? es : undefined })
                    ) : (
                      <span>{locale === 'es' ? 'Seleccionar fecha' : 'Pick a date'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(newDate) => {
                      setEndDate(newDate)
                      setFormData({ 
                        ...formData, 
                        end_date: newDate ? format(newDate, 'yyyy-MM-dd') : null 
                      })
                    }}
                    initialFocus
                    className=""
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">
                {locale === 'es' ? 'Prioridad' : 'Priority'}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'high' | 'medium' | 'low') => setFormData({ 
                  ...formData, 
                  priority: value 
                })}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
                onValueChange={(value: 'planning' | 'in_progress' | 'completed' | 'overdue') => setFormData({ 
                  ...formData, 
                  status: value 
                })}
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


          {initiatives.length > 0 && (
            <div className="space-y-2">
              <Label>
                {locale === 'es' ? 'Vincular Iniciativas' : 'Link Initiatives'}
              </Label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted">
                {initiatives
                  .filter(init => !formData.area_id || init.area_id === formData.area_id)
                  .map((initiative) => (
                    <label 
                      key={initiative.id} 
                      className="flex items-start space-x-2 p-2 hover:bg-accent cursor-pointer rounded"
                    >
                      <input
                        type="checkbox"
                        value={initiative.id}
                        checked={selectedInitiatives.includes(initiative.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInitiatives([...selectedInitiatives, initiative.id])
                          } else {
                            setSelectedInitiatives(selectedInitiatives.filter(id => id !== initiative.id))
                          }
                        }}
                        disabled={loading}
                        className="rounded border-border text-primary focus:ring-ring mt-1"
                      />
                      <div className="flex-1">
                        <span className="text-sm block">{initiative.title}</span>
                        {initiative.progress !== undefined && (
                          <span className="text-muted-foreground text-xs">
                            {locale === 'es' ? 'Progreso' : 'Progress'}: {initiative.progress}%
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                {initiatives.filter(init => !formData.area_id || init.area_id === formData.area_id).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-2">
                    {locale === 'es' ? 'No hay iniciativas disponibles' : 'No initiatives available'}
                  </p>
                )}
              </div>
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