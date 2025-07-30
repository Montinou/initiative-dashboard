'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Target, Info, Loader2, Users } from 'lucide-react'
import { useAuth, useTenantId } from '@/lib/auth-context'
import { getThemeFromTenant } from '@/lib/theme-config'

interface TemplateDownloadProps {
  filename?: string
}

export function TemplateDownload({ filename }: TemplateDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { session, profile } = useAuth()
  const tenantId = useTenantId()
  const theme = tenantId ? getThemeFromTenant(tenantId) : null

  const handleDownload = async () => {
    if (!session?.access_token) {
      alert('You must be logged in to download templates.')
      return
    }

    setIsDownloading(true)
    try {
      const response = await fetch('/api/download-template', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const defaultFilename = filename || `okr-template-${profile?.tenant_id || 'template'}-${new Date().toISOString().split('T')[0]}.xlsx`
      link.download = defaultFilename
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
    <Card className={`backdrop-blur-md bg-card/50 shadow-xl transition-all duration-200 hover:shadow-2xl ${
      theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
        ? 'border border-siga-green/30 hover:border-siga-green/50' 
        : 'border border-border'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Target className={`h-5 w-5 ${
            theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
            theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
            'text-primary'
          }`} />
          <CardTitle className={`text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent ${
            theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
              ? 'from-siga-green to-siga-green/80' 
              : 'from-foreground to-muted-foreground'
          }`}>
            Plantilla OKR - Plan de Acción
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Plantilla completa con estructura OKR para seguimiento organizacional
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-lg p-4 transition-colors duration-200 ${
          theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
            ? 'bg-siga-green/5 border border-siga-green/20' 
            : 'bg-muted/20 border border-border'
        }`}>
          <div className="flex items-start gap-2 mb-3">
            <Info className={`h-4 w-4 mt-0.5 ${
              theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-blue' :
              theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-green' :
              'text-primary'
            }`} />
            <div>
              <h4 className="font-medium text-foreground mb-1">Contenido de la plantilla:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Estructura OKR (Objectives and Key Results) completa</li>
                <li>• Formato estandarizado para seguimiento organizacional</li>
                <li>• Plantilla con datos de referencia incluidos</li>
                <li>• Estructura organizacional detallada por áreas</li>
                <li>• Métricas y KPIs preconfigurados</li>
                <li>• Compatible con el sistema de carga actual</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h5 className="font-medium text-foreground">Características:</h5>
            <ul className="text-muted-foreground space-y-1">
              <li>• Plantilla OKR completa</li>
              <li>• Estructura OKR completa</li>
              <li>• Datos de referencia incluidos</li>
              <li>• Formato Excel (.xlsx)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-medium text-foreground">Uso recomendado:</h5>
            <ul className="text-muted-foreground space-y-1">
              <li>• Cualquier tipo de organización</li>
              <li>• Implementación OKR inicial</li>
              <li>• Referencia de estructura</li>
              <li>• Base para customización</li>
            </ul>
          </div>
        </div>

        <div className={`rounded-lg p-3 transition-colors duration-200 ${
          theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' 
            ? 'bg-siga-green/5 border border-siga-green/20' 
            : 'bg-muted/10 border border-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Users className={`h-4 w-4 ${
              theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'text-fema-yellow' :
              theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'text-siga-yellow' :
              'text-secondary'
            }`} />
            <span className="text-sm font-medium text-foreground">Plantilla OKR Completa</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta plantilla contiene una estructura completa de OKRs lista para usar en cualquier organización para el seguimiento de objetivos.
          </p>
        </div>

        <Button 
          onClick={handleDownload}
          disabled={isDownloading}
          className={`w-full bg-gradient-to-r border-0 disabled:opacity-50 text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
            theme?.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb' ? 'from-fema-blue to-fema-yellow hover:from-fema-blue/80 hover:to-fema-yellow/80 shadow-lg hover:shadow-fema-blue/25' :
            theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2' ? 'from-siga-green to-siga-green/80 hover:from-siga-green/90 hover:to-siga-green/70 shadow-lg hover:shadow-siga-green/25 hover:shadow-xl' :
            'from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 shadow-lg hover:shadow-primary/25'
          }`}
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Descargando plantilla...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla OKR
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}