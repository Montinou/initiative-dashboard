"use client"

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { FileUploadWithProgress } from '@/components/upload/FileUploadWithProgress'
import { 
  FileText, 
  Upload, 
  Download, 
  Plus,
  Trash2,
  Save,
  Calendar,
  Target,
  Users,
  AlertCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

interface InitiativeForm {
  objetivo: string
  iniciativa: string
  descripcion: string
  progreso: number
  estado: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  prioridad: 'low' | 'medium' | 'high'
  responsable: string
  fechaInicio: string
  fechaFin: string
}

export default function ManagerImportPage() {
  const { profile, loading: authLoading } = useAuth()
  const t = useTranslations('manager')
  const [uploadHistory, setUploadHistory] = useState<any[]>([])
  const [initiatives, setInitiatives] = useState<InitiativeForm[]>([{
    objetivo: '',
    iniciativa: '',
    descripcion: '',
    progreso: 0,
    estado: 'planning',
    prioridad: 'medium',
    responsable: '',
    fechaInicio: format(new Date(), 'yyyy-MM-dd'),
    fechaFin: ''
  }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUploadComplete = (result: any) => {
    setUploadHistory(prev => [{
      id: Date.now(),
      fileName: result.fileName,
      uploadedAt: new Date().toISOString(),
      recordsProcessed: result.recordsProcessed,
      savedInitiatives: result.savedInitiatives,
      errors: result.errors
    }, ...prev])
    
    if (result.savedInitiatives > 0) {
      toast.success(`Se importaron ${result.savedInitiatives} iniciativas correctamente`)
    }
    
    if (result.errors?.length > 0) {
      toast.error(`Se encontraron ${result.errors.length} errores durante la importación`)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/upload/template/excel')
      if (!response.ok) throw new Error('Failed to download template')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla-iniciativas-manager.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Plantilla descargada exitosamente')
    } catch (error) {
      toast.error('Error al descargar la plantilla')
    }
  }

  const addInitiative = () => {
    setInitiatives([...initiatives, {
      objetivo: '',
      iniciativa: '',
      descripcion: '',
      progreso: 0,
      estado: 'planning',
      prioridad: 'medium',
      responsable: '',
      fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      fechaFin: ''
    }])
  }

  const removeInitiative = (index: number) => {
    setInitiatives(initiatives.filter((_, i) => i !== index))
  }

  const updateInitiative = (index: number, field: keyof InitiativeForm, value: any) => {
    const updated = [...initiatives]
    updated[index] = { ...updated[index], [field]: value }
    setInitiatives(updated)
  }

  const handleManualSubmit = async () => {
    // Validate all initiatives
    const valid = initiatives.every(init => 
      init.objetivo && 
      init.iniciativa && 
      init.fechaInicio && 
      init.fechaFin
    )
    
    if (!valid) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setIsSubmitting(true)

    try {
      // Create CSV content from form data
      const csvHeaders = 'Objetivo,Iniciativa,Descripción,Progreso,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Fin'
      const csvRows = initiatives.map(init => 
        [
          init.objetivo,
          init.iniciativa,
          init.descripcion,
          init.progreso,
          init.estado,
          init.prioridad,
          init.responsable,
          init.fechaInicio,
          init.fechaFin
        ].map(val => `"${val}"`).join(',')
      )
      const csvContent = [csvHeaders, ...csvRows].join('\n')
      
      // Create a file from the CSV content
      const file = new File([csvContent], 'manual-import.csv', { type: 'text/csv' })
      
      // Submit using the upload endpoint
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', 'initiatives')
      if (profile?.area_id) {
        formData.append('areaId', profile.area_id)
      }

      const response = await fetch('/api/upload/with-gcs-backup', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to submit initiatives')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Se crearon ${result.data.savedInitiatives} iniciativas exitosamente`)
        // Reset form
        setInitiatives([{
          objetivo: '',
          iniciativa: '',
          descripcion: '',
          progreso: 0,
          estado: 'planning',
          prioridad: 'medium',
          responsable: '',
          fechaInicio: format(new Date(), 'yyyy-MM-dd'),
          fechaFin: ''
        }])
        
        // Add to history
        handleUploadComplete(result.data)
      } else {
        throw new Error(result.error || 'Failed to save initiatives')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Error al guardar las iniciativas')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded w-64 animate-pulse" />
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Importar Iniciativas
          </h1>
          <p className="text-muted-foreground">
            Crea nuevas iniciativas manualmente o importa desde un archivo
          </p>
        </div>

        {/* Alert for managers */}
        {profile?.role === 'Manager' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Como Manager, las iniciativas se crearán automáticamente en tu área asignada: 
              <Badge variant="secondary" className="ml-2">{profile.area_name || 'Área no asignada'}</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">
              <FileText className="h-4 w-4 mr-2" />
              Formulario Manual
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Subir Archivo
            </TabsTrigger>
            <TabsTrigger value="history">
              <Calendar className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Manual Form Tab */}
          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crear Iniciativas Manualmente</CardTitle>
                <CardDescription>
                  Ingresa los datos de las iniciativas directamente en el formulario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {initiatives.map((initiative, index) => (
                  <Card key={index} className="p-4 border-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          Iniciativa {index + 1}
                        </h3>
                        {initiatives.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInitiative(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Objetivo */}
                        <div className="space-y-2">
                          <Label htmlFor={`objetivo-${index}`}>
                            Objetivo Estratégico *
                          </Label>
                          <Input
                            id={`objetivo-${index}`}
                            value={initiative.objetivo}
                            onChange={(e) => updateInitiative(index, 'objetivo', e.target.value)}
                            placeholder="Ej: Aumentar eficiencia operativa"
                            required
                          />
                        </div>

                        {/* Iniciativa */}
                        <div className="space-y-2">
                          <Label htmlFor={`iniciativa-${index}`}>
                            Nombre de la Iniciativa *
                          </Label>
                          <Input
                            id={`iniciativa-${index}`}
                            value={initiative.iniciativa}
                            onChange={(e) => updateInitiative(index, 'iniciativa', e.target.value)}
                            placeholder="Ej: Automatización de procesos"
                            required
                          />
                        </div>

                        {/* Descripción */}
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`descripcion-${index}`}>
                            Descripción
                          </Label>
                          <Textarea
                            id={`descripcion-${index}`}
                            value={initiative.descripcion}
                            onChange={(e) => updateInitiative(index, 'descripcion', e.target.value)}
                            placeholder="Describe los detalles de la iniciativa..."
                            rows={3}
                          />
                        </div>

                        {/* Estado */}
                        <div className="space-y-2">
                          <Label htmlFor={`estado-${index}`}>
                            Estado
                          </Label>
                          <Select
                            value={initiative.estado}
                            onValueChange={(value: any) => updateInitiative(index, 'estado', value)}
                          >
                            <SelectTrigger id={`estado-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planning">Planificación</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="completed">Completado</SelectItem>
                              <SelectItem value="on_hold">En Pausa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Prioridad */}
                        <div className="space-y-2">
                          <Label htmlFor={`prioridad-${index}`}>
                            Prioridad
                          </Label>
                          <Select
                            value={initiative.prioridad}
                            onValueChange={(value: any) => updateInitiative(index, 'prioridad', value)}
                          >
                            <SelectTrigger id={`prioridad-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Progreso */}
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`progreso-${index}`}>
                            Progreso: {initiative.progreso}%
                          </Label>
                          <Slider
                            id={`progreso-${index}`}
                            value={[initiative.progreso]}
                            onValueChange={(value) => updateInitiative(index, 'progreso', value[0])}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Responsable */}
                        <div className="space-y-2">
                          <Label htmlFor={`responsable-${index}`}>
                            Responsable
                          </Label>
                          <Input
                            id={`responsable-${index}`}
                            value={initiative.responsable}
                            onChange={(e) => updateInitiative(index, 'responsable', e.target.value)}
                            placeholder="Nombre del responsable"
                          />
                        </div>

                        {/* Fechas */}
                        <div className="space-y-2">
                          <Label htmlFor={`fechaInicio-${index}`}>
                            Fecha de Inicio *
                          </Label>
                          <Input
                            id={`fechaInicio-${index}`}
                            type="date"
                            value={initiative.fechaInicio}
                            onChange={(e) => updateInitiative(index, 'fechaInicio', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`fechaFin-${index}`}>
                            Fecha de Fin *
                          </Label>
                          <Input
                            id={`fechaFin-${index}`}
                            type="date"
                            value={initiative.fechaFin}
                            onChange={(e) => updateInitiative(index, 'fechaFin', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Add Initiative Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInitiative}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar otra iniciativa
                </Button>

                {/* Submit Button */}
                <Button
                  onClick={handleManualSubmit}
                  disabled={isSubmitting || initiatives.length === 0}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Guardando...' : `Guardar ${initiatives.length} iniciativa${initiatives.length > 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subir Archivo de Iniciativas</CardTitle>
                <CardDescription>
                  Importa múltiples iniciativas desde un archivo Excel o CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Download Template */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="font-medium">Descarga la plantilla</p>
                    <p className="text-sm text-muted-foreground">
                      Usa nuestra plantilla para asegurar el formato correcto
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                </div>

                {/* Upload Component */}
                <FileUploadWithProgress 
                  onUploadComplete={handleUploadComplete}
                  entityType="initiatives"
                />

                {/* Instructions */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Formato esperado del archivo:</strong>
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Primera fila: encabezados de columnas</li>
                      <li>Columnas requeridas: Objetivo, Iniciativa, Fecha Inicio, Fecha Fin</li>
                      <li>Formato de fecha: DD/MM/AAAA o AAAA-MM-DD</li>
                      <li>Estados válidos: planificación, en_progreso, completado, en_pausa</li>
                      <li>Prioridades válidas: alta, media, baja</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Importaciones</CardTitle>
                <CardDescription>
                  Registro de archivos procesados recientemente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay importaciones recientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploadHistory.map((upload) => (
                      <div key={upload.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{upload.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(upload.uploadedAt), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="font-medium">{upload.savedInitiatives}</span> de{' '}
                              <span className="font-medium">{upload.recordsProcessed}</span> guardadas
                            </p>
                            {upload.errors?.length > 0 && (
                              <Badge variant="destructive">{upload.errors.length} errores</Badge>
                            )}
                          </div>
                        </div>
                        
                        {upload.errors?.length > 0 && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                            <p className="font-medium text-destructive mb-1">Errores encontrados:</p>
                            <ul className="list-disc list-inside text-destructive/80">
                              {upload.errors.slice(0, 3).map((error: string, i: number) => (
                                <li key={i}>{error}</li>
                              ))}
                              {upload.errors.length > 3 && (
                                <li>...y {upload.errors.length - 3} más</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}