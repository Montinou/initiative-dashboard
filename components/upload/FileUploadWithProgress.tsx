"use client"

import React, { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'

interface FileUploadWithProgressProps {
  onUploadComplete?: (result: any) => void
  entityType?: 'initiatives' | 'objectives' | 'activities'
  areaId?: string
  accept?: string
  maxSize?: number // in MB
}

interface UploadStage {
  stage: 'idle' | 'uploading' | 'processing' | 'saving' | 'complete' | 'error'
  progress: number
  message: string
  details?: string
}

export function FileUploadWithProgress({
  onUploadComplete,
  entityType = 'initiatives',
  areaId,
  accept = '.xlsx,.xls,.csv',
  maxSize = 10
}: FileUploadWithProgressProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploadStage, setUploadStage] = useState<UploadStage>({
    stage: 'idle',
    progress: 0,
    message: ''
  })
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024
    if (selectedFile.size > maxSizeBytes) {
      toast({
        title: 'Archivo muy grande',
        description: `El archivo no debe exceder ${maxSize}MB`,
        variant: 'destructive'
      })
      return
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV',
        variant: 'destructive'
      })
      return
    }

    setFile(selectedFile)
    setUploadStage({ stage: 'idle', progress: 0, message: '' })
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      // Stage 1: Uploading to server
      setUploadStage({
        stage: 'uploading',
        progress: 20,
        message: 'Subiendo archivo al servidor...',
        details: `Enviando ${(file.size / 1024).toFixed(2)} KB`
      })

      const formData = new FormData()
      formData.append('file', file)
      if (areaId) {
        formData.append('areaId', areaId)
      }
      formData.append('entityType', entityType)

      // Upload with progress tracking
      const response = await uploadWithProgress(
        '/api/upload/with-gcs-backup',
        formData,
        (progress) => {
          setUploadStage(prev => ({
            ...prev,
            progress: Math.min(40, 20 + (progress * 0.2))
          }))
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al subir archivo')
      }

      // Stage 2: Processing file
      setUploadStage({
        stage: 'processing',
        progress: 50,
        message: 'Procesando datos del archivo...',
        details: 'Validando formato y contenido'
      })

      const data = await response.json()

      // Simulate processing progress
      await simulateProgress(50, 70, 'Analizando filas...')

      // Stage 3: Saving to database
      setUploadStage({
        stage: 'saving',
        progress: 80,
        message: 'Guardando en base de datos...',
        details: `Procesando ${data.data?.recordsProcessed || 0} registros`
      })

      await simulateProgress(80, 95, 'Finalizando...')

      // Stage 4: Complete
      setUploadStage({
        stage: 'complete',
        progress: 100,
        message: '¡Carga completada exitosamente!',
        details: `${data.data?.savedInitiatives || 0} iniciativas importadas`
      })

      setResult(data)
      
      if (onUploadComplete) {
        onUploadComplete(data)
      }

      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${data.data?.savedInitiatives || 0} iniciativas correctamente`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStage({
        stage: 'error',
        progress: 0,
        message: 'Error al procesar archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })

      toast({
        title: 'Error en la importación',
        description: error instanceof Error ? error.message : 'Error al procesar el archivo',
        variant: 'destructive'
      })
    }
  }

  const simulateProgress = (start: number, end: number, message: string) => {
    return new Promise<void>((resolve) => {
      const steps = 10
      const increment = (end - start) / steps
      let current = start
      
      const interval = setInterval(() => {
        current += increment
        if (current >= end) {
          clearInterval(interval)
          resolve()
        } else {
          setUploadStage(prev => ({
            ...prev,
            progress: Math.round(current),
            details: message
          }))
        }
      }, 100)
    })
  }

  const uploadWithProgress = (
    url: string,
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        resolve(new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers({ 'Content-Type': 'application/json' })
        }))
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'))
      })

      xhr.open('POST', url)
      xhr.send(formData)
    })
  }

  const reset = () => {
    setFile(null)
    setUploadStage({ stage: 'idle', progress: 0, message: '' })
    setResult(null)
  }

  const getStageIcon = () => {
    switch (uploadStage.stage) {
      case 'uploading':
      case 'processing':
      case 'saving':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Upload className="h-5 w-5" />
    }
  }

  const getStageColor = () => {
    switch (uploadStage.stage) {
      case 'complete':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Datos</CardTitle>
        <CardDescription>
          Suba un archivo Excel (.xlsx, .xls) o CSV con los datos a importar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File input */}
        <div className="space-y-2">
          <label htmlFor="file-upload" className="block text-sm font-medium">
            Seleccionar archivo
          </label>
          <div className="flex items-center gap-4">
            <input
              id="file-upload"
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadStage.stage !== 'idle' && uploadStage.stage !== 'complete' && uploadStage.stage !== 'error'}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploadStage.stage !== 'idle' && uploadStage.stage !== 'complete' && uploadStage.stage !== 'error'}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Progress section */}
        {uploadStage.stage !== 'idle' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStageIcon()}
              <span className={`font-medium ${getStageColor()}`}>
                {uploadStage.message}
              </span>
            </div>
            
            {uploadStage.stage !== 'complete' && uploadStage.stage !== 'error' && (
              <Progress value={uploadStage.progress} className="h-2" />
            )}
            
            {uploadStage.details && (
              <p className="text-sm text-muted-foreground">
                {uploadStage.details}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {result && uploadStage.stage === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Importación completada</p>
                <ul className="text-sm space-y-1 mt-2">
                  <li>• Registros procesados: {result.data?.recordsProcessed || 0}</li>
                  <li>• Iniciativas guardadas: {result.data?.savedInitiatives || 0}</li>
                  {result.data?.errors?.length > 0 && (
                    <li className="text-amber-600">
                      • Advertencias: {result.data.errors.length}
                    </li>
                  )}
                  {result.data?.gcsUrl && (
                    <li className="text-muted-foreground">
                      • Archivo respaldado en la nube
                    </li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {uploadStage.stage === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Error en la importación</p>
                <p className="text-sm">{uploadStage.details}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {uploadStage.stage === 'idle' && file && (
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Iniciar importación
            </Button>
          )}
          
          {(uploadStage.stage === 'complete' || uploadStage.stage === 'error') && (
            <Button variant="outline" onClick={reset}>
              Nueva importación
            </Button>
          )}

          <Button
            variant="ghost"
            asChild
          >
            <a href="/api/upload/template/excel" download>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar plantilla
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}