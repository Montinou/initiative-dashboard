'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Building2, 
  User, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Form validation schema
const areaFormSchema = z.object({
  name: z.string().min(2, 'Area name must be at least 2 characters').max(100, 'Area name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  manager_id: z.string().optional(),
  is_active: z.boolean().default(true)
})

type AreaFormData = z.infer<typeof areaFormSchema>

interface AreaFormModalProps {
  isOpen: boolean
  onClose: () => void
  area?: {
    id: string
    name: string
    description?: string
    manager_id?: string
    is_active: boolean
  } | null
  onSave: (data: AreaFormData) => Promise<void>
}

// Mock managers data - will be replaced with real API calls
const mockManagers = [
  { id: 'mgr1', full_name: 'John Smith', email: 'john@company.com' },
  { id: 'mgr2', full_name: 'Sarah Johnson', email: 'sarah@company.com' },
  { id: 'mgr3', full_name: 'Michael Brown', email: 'michael@company.com' },
  { id: 'mgr4', full_name: 'Emily Davis', email: 'emily@company.com' },
  { id: 'mgr5', full_name: 'David Wilson', email: 'david@company.com' }
]

export function AreaFormModal({ isOpen, onClose, area, onSave }: AreaFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [impactPreview, setImpactPreview] = useState<{
    affectedUsers: number
    affectedObjectives: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: '',
      description: '',
      manager_id: '',
      is_active: true
    }
  })

  const watchedManagerId = watch('manager_id')
  const watchedName = watch('name')

  // Reset form when area changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (area) {
        reset({
          name: area.name,
          description: area.description || '',
          manager_id: area.manager_id || '',
          is_active: area.is_active
        })
        // Mock impact preview for editing
        setImpactPreview({
          affectedUsers: Math.floor(Math.random() * 10) + 1,
          affectedObjectives: Math.floor(Math.random() * 5) + 1
        })
      } else {
        reset({
          name: '',
          description: '',
          manager_id: '',
          is_active: true
        })
        setImpactPreview(null)
      }
    }
  }, [isOpen, area, reset])

  // Calculate impact preview when editing
  useEffect(() => {
    if (area && watchedName) {
      // Mock calculation - in real app, this would be an API call
      setImpactPreview({
        affectedUsers: Math.floor(Math.random() * 10) + 1,
        affectedObjectives: Math.floor(Math.random() * 5) + 1
      })
    }
  }, [area, watchedName, watchedManagerId])

  const onSubmit = async (data: AreaFormData) => {
    try {
      setIsSubmitting(true)
      await onSave(data)
      onClose()
      reset()
    } catch (error) {
      console.error('Error saving area:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      reset()
      setImpactPreview(null)
    }
  }

  const selectedManager = mockManagers.find(m => m.id === watchedManagerId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {area ? 'Edit Area' : 'Create New Area'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {area 
              ? 'Update area information and assignments'
              : 'Create a new organizational area and assign a manager'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Area Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g. Sales & Marketing, Technology, HR"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the area's purpose and responsibilities"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
              {errors.description && (
                <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Manager Assignment */}
          <div>
            <Label className="text-white">Area Manager</Label>
            <Select 
              value={getValues('manager_id')} 
              onValueChange={(value) => setValue('manager_id', value)}
            >
              <SelectTrigger className="mt-1 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select a manager (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="" className="text-white">No manager assigned</SelectItem>
                {mockManagers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id} className="text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {manager.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{manager.full_name}</div>
                        <div className="text-sm text-gray-400">{manager.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedManager && (
              <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Selected: {selectedManager.full_name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{selectedManager.email}</p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Area Status</Label>
              <p className="text-sm text-gray-400">Active areas are visible to all users</p>
            </div>
            <Switch
              checked={getValues('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          {/* Impact Preview */}
          {area && impactPreview && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                <strong>Impact Preview:</strong> Changes will affect {impactPreview.affectedUsers} users 
                and {impactPreview.affectedObjectives} objectives. Users will be notified of changes.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {!area && watchedName && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">
                Ready to create "{watchedName}" area
                {selectedManager ? ` with ${selectedManager.full_name} as manager` : ' with no assigned manager'}.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                area ? 'Update Area' : 'Create Area'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}