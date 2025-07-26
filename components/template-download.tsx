'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileSpreadsheet, Info, Loader2 } from 'lucide-react'

interface TemplateDownloadProps {
  tenantId?: string
  filename?: string
}

export function TemplateDownload({ tenantId = 'demo', filename }: TemplateDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/download-template?tenant_id=${tenantId}`)
      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `tablero-gestion-${tenantId}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Error downloading template. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
          <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Plantilla Excel - Tablero de Gestión
          </CardTitle>
        </div>
        <CardDescription className="text-white/70">
          Descarga la plantilla estandarizada para seguimiento de objetivos organizacionales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-start gap-2 mb-3">
            <Info className="h-4 w-4 text-cyan-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-white mb-1">Contenido de la plantilla:</h4>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• Formato "TABLERO DE GESTION Y SEGUIMIENTO EQUIPO GERENCIAL"</li>
                <li>• Columnas: Área, Objetivo Clave, % Avance Q2, Obstáculos, Potenciadores, Estado</li>
                <li>• Datos de ejemplo para las 4 áreas principales (RRHH, Administración, Comercial, Producto)</li>
                <li>• Validación de datos y formato profesional</li>
                <li>• Hoja de instrucciones incluida</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h5 className="font-medium text-white">Áreas incluidas:</h5>
            <ul className="text-white/70 space-y-1">
              <li>• RRHH</li>
              <li>• Administración</li>
              <li>• Comercial</li>
              <li>• Producto</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-medium text-white">Características:</h5>
            <ul className="text-white/70 space-y-1">
              <li>• Formato Excel (.xlsx)</li>
              <li>• Datos de ejemplo</li>
              <li>• Validación automática</li>
              <li>• Guía de uso incluida</li>
            </ul>
          </div>
        </div>

        <Button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white border-0 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando plantilla...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla Excel
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}