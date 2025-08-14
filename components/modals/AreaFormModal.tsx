'use client'

import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Building2 } from 'lucide-react'
import useSWR from 'swr'

interface Area {
  id?: string
  name: string
  description?: string
  manager_id?: string | null
  is_active?: boolean
}

interface Manager {
  id: string
  full_name: string
  email: string
  area_id?: string | null
}

interface AreaFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Area) => Promise<void>
  area?: Area | null
  locale?: string
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())

export default function AreaFormModal({ isOpen, onClose, onSave, area, locale = 'es' }: AreaFormModalProps) {
  const [formData, setFormData] = useState<Area>({
    name: '',
    description: '',
    manager_id: null,
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available managers (users with Manager role)
  const { data: usersData } = useSWR('/api/org-admin/users?role=Manager', fetcher)
  const managers: Manager[] = usersData?.users?.filter((u: any) => u.role === 'Manager') || []

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name,
        description: area.description || '',
        manager_id: area.manager_id || null,
        is_active: area.is_active !== undefined ? area.is_active : true
      })
    } else {
      setFormData({
        name: '',
        description: '',
        manager_id: null,
        is_active: true
      })
    }
    setError(null)
  }, [area, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError(locale === 'es' ? 'El nombre del área es requerido' : 'Area name is required')
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || (locale === 'es' ? 'Error al guardar el área' : 'Error saving area'))
    } finally {
      setLoading(false)
    }
  }

  const title = area 
    ? (locale === 'es' ? 'Editar Área' : 'Edit Area')
    : (locale === 'es' ? 'Crear Nueva Área' : 'Create New Area')

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !loading && !open && onClose()}
      title={
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-purple-400" />
          {title}
        </div>
      }
      onSubmit={handleSubmit}
      submitText={loading 
        ? (locale === 'es' ? 'Guardando...' : 'Saving...')
        : (locale === 'es' ? 'Guardar' : 'Save')
      }
      cancelText={locale === 'es' ? 'Cancelar' : 'Cancel'}
      onCancel={onClose}
      submitDisabled={loading}
      size="md"
      variant="dark"
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white">
            {locale === 'es' ? 'Nombre del Área' : 'Area Name'} *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={locale === 'es' ? 'ej. Recursos Humanos' : 'e.g. Human Resources'}
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
              ? 'Describe las responsabilidades del área...' 
              : 'Describe the area responsibilities...'
            }
            className="bg-white/5 border-white/10 text-white min-h-[100px]"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager" className="text-white">
            {locale === 'es' ? 'Gerente del Área' : 'Area Manager'}
          </Label>
          <Select
            value={formData.manager_id || 'none'}
            onValueChange={(value) => setFormData({ 
              ...formData, 
              manager_id: value === 'none' ? null : value 
            })}
            disabled={loading}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder={locale === 'es' ? 'Seleccionar gerente' : 'Select manager'} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="none" className="text-gray-400">
                {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
              </SelectItem>
              {managers.map((manager) => (
                <SelectItem 
                  key={manager.id} 
                  value={manager.id}
                  className="text-white"
                  disabled={manager.area_id && manager.area_id !== area?.id}
                >
                  {manager.full_name || manager.email}
                  {manager.area_id && manager.area_id !== area?.id && ' (Asignado)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">
            {locale === 'es' 
              ? 'Solo usuarios con rol de Gerente pueden ser asignados' 
              : 'Only users with Manager role can be assigned'
            }
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="active" className="text-white">
            {locale === 'es' ? 'Área Activa' : 'Active Area'}
          </Label>
          <Switch
            id="active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            disabled={loading}
          />
        </div>
      </div>
    </FormDialog>
  )
}