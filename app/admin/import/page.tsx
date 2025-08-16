"use client"

import { FileUploadWithProgress } from '@/components/upload/FileUploadWithProgress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileSpreadsheet, History, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UploadHistory {
  id: string
  original_filename: string
  file_size: number
  created_at: string
  gcs_url?: string
  metadata?: any
}

export default function ImportPage() {
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchUploadHistory = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setUploadHistory(data || [])
    } catch (error) {
      console.error('Error fetching upload history:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el historial de cargas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUploadHistory()
  }, [])

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result)
    // Refresh history
    fetchUploadHistory()
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importación de Datos</h1>
        <p className="text-muted-foreground mt-2">
          Importe datos masivos desde archivos Excel o CSV
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Nueva Importación
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Download className="h-4 w-4 mr-2" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <FileUploadWithProgress 
            onUploadComplete={handleUploadComplete}
            entityType="initiatives"
          />

          <Card>
            <CardHeader>
              <CardTitle>Instrucciones</CardTitle>
              <CardDescription>
                Cómo preparar su archivo para importación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Descargue la plantilla Excel desde la pestaña "Plantillas"</li>
                <li>Complete los datos siguiendo el formato especificado</li>
                <li>Asegúrese de que los nombres de las áreas coincidan con las existentes</li>
                <li>El progreso debe ser un número entre 0 y 100</li>
                <li>Las fechas deben estar en formato DD/MM/YYYY</li>
                <li>Guarde el archivo y súbalo usando el formulario de arriba</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Importaciones</CardTitle>
              <CardDescription>
                Últimas 10 importaciones realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : uploadHistory.length > 0 ? (
                <div className="space-y-2">
                  {uploadHistory.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{upload.original_filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(upload.file_size)} • {' '}
                            {format(new Date(upload.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                      {upload.gcs_url && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          Respaldado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay importaciones previas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Importación</CardTitle>
              <CardDescription>
                Descargue plantillas pre-configuradas para diferentes tipos de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Plantilla de Iniciativas</CardTitle>
                    <CardDescription className="text-sm">
                      Para importar objetivos e iniciativas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <a href="/api/upload/template/excel" download>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Excel
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Plantilla CSV</CardTitle>
                    <CardDescription className="text-sm">
                      Formato CSV para sistemas externos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <a href="/api/upload/template/csv" download>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar CSV
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium mb-2">Formato de columnas</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>Área</strong>: Nombre del área (solo para CEO/Admin)</li>
                  <li>• <strong>Objetivo</strong>: Objetivo estratégico</li>
                  <li>• <strong>Iniciativa</strong>: Nombre de la iniciativa</li>
                  <li>• <strong>Descripción</strong>: Descripción detallada</li>
                  <li>• <strong>Progreso</strong>: Número de 0 a 100</li>
                  <li>• <strong>Estado</strong>: planning, in_progress, completed, on_hold</li>
                  <li>• <strong>Prioridad</strong>: high, medium, low</li>
                  <li>• <strong>Responsable</strong>: Nombre del responsable</li>
                  <li>• <strong>Fecha Inicio</strong>: DD/MM/YYYY</li>
                  <li>• <strong>Fecha Fin</strong>: DD/MM/YYYY</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}