'use client'

import { useState } from 'react'
import { ArrowLeft, Upload, BarChart3, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TemplateDownload } from '@/components/template-download'
import { FileUploadComponent } from '@/components/file-upload'
import Link from 'next/link'

export default function UploadPage() {
  const [uploadResults, setUploadResults] = useState<any[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const handleUploadComplete = (result: any) => {
    setUploadResults(prev => [...prev, result])
    
    if (result.success) {
      setShowSuccess(true)
      // Auto-hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-white/20" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Gestión de Archivos Excel
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Sube plantillas del "Tablero de Gestión y Seguimiento"
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <h3 className="font-medium text-green-300">Archivo procesado exitosamente</h3>
              <p className="text-sm text-green-200">Los datos se han integrado con el dashboard</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Section */}
          <div className="lg:col-span-2">
            <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir Archivo Excel
                </CardTitle>
                <CardDescription className="text-white/70">
                  Arrastra archivos Excel o CSV del tablero de gestión para procesarlos automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadComponent
                  onUploadComplete={handleUploadComplete}
                  maxFiles={3}
                  accept={['.xlsx', '.xls', '.csv']}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Download */}
            <TemplateDownload />

            {/* Instructions */}
            <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Instrucciones de Uso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/80">
                <div className="space-y-2">
                  <h4 className="font-medium text-white">1. Descargar Plantilla</h4>
                  <p>Descarga la plantilla estándar desde el panel lateral</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">2. Completar Datos</h4>
                  <p>Completa la plantilla con tus objetivos organizacionales</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">3. Subir Archivo</h4>
                  <p>Arrastra el archivo completado a la zona de carga</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">4. Verificar Datos</h4>
                  <p>Revisa que los datos se procesaron correctamente</p>
                </div>
              </CardContent>
            </Card>

            {/* File Format Info */}
            <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Formatos Compatibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Excel (.xlsx, .xls)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>CSV con codificación UTF-8</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Tamaño máximo: 10 MB</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

            {/* Quick Actions */}
            <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/">
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white justify-start"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Dashboard
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white justify-start"
                  onClick={() => window.location.reload()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Otro Archivo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}