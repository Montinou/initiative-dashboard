'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Info, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

/**
 * Componente de demostración del sistema de colores SIGA Turismo
 * Muestra todos los colores y componentes estilizados con la paleta oficial
 */
export default function SigaColorShowcase() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen bg-background p-8" data-theme="siga">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Sistema de Colores SIGA Turismo
          </h1>
          <p className="text-muted-foreground text-lg">
            Paleta oficial de colores para el Initiative Dashboard
          </p>
          
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="ml-auto"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Colores Principales</CardTitle>
            <CardDescription>
              Colores oficiales de la marca SIGA Turismo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Verde SIGA */}
              <div className="space-y-2">
                <div className="h-32 bg-siga-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold">Verde SIGA</span>
                </div>
                <p className="text-sm text-muted-foreground">#00B74A</p>
                <p className="text-xs">RGB(0, 183, 74)</p>
              </div>

              {/* Amarillo SIGA */}
              <div className="space-y-2">
                <div className="h-32 bg-siga-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-semibold">Amarillo SIGA</span>
                </div>
                <p className="text-sm text-muted-foreground">#FFC107</p>
                <p className="text-xs">RGB(255, 193, 7)</p>
              </div>

              {/* Gris Perla */}
              <div className="space-y-2">
                <div className="h-32 bg-siga-gray-50 dark:bg-siga-dark-muted rounded-lg flex items-center justify-center border">
                  <span className="text-foreground font-semibold">Gris Perla</span>
                </div>
                <p className="text-sm text-muted-foreground">#F8F9FA</p>
                <p className="text-xs">RGB(248, 249, 250)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Botones</CardTitle>
            <CardDescription>
              Variantes de botones con colores SIGA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button className="bg-siga-green-500 hover:bg-siga-green-600 text-white dark:bg-siga-green-dark dark:hover:bg-siga-green-dark-hover dark:text-black">
                Botón Primario
              </Button>
              <Button className="bg-siga-yellow-500 hover:bg-siga-yellow-600 text-gray-900 dark:bg-siga-yellow-dark dark:hover:bg-siga-yellow-dark-hover dark:text-black">
                Botón Acento
              </Button>
              <Button variant="outline" className="border-siga-green-500 text-siga-green-600 hover:bg-siga-green-50 dark:border-siga-green-dark dark:text-siga-green-dark dark:hover:bg-siga-green-dark/10">
                Botón Outline
              </Button>
              <Button variant="ghost" className="hover:bg-siga-gray-50 dark:hover:bg-siga-dark-muted">
                Botón Ghost
              </Button>
              <Button variant="secondary">
                Botón Secundario
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              Estados y etiquetas con colores SIGA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge className="bg-siga-green-500 text-white dark:bg-siga-green-dark dark:text-black">
                Activo
              </Badge>
              <Badge className="bg-siga-yellow-500 text-gray-900 dark:bg-siga-yellow-dark dark:text-black">
                Pendiente
              </Badge>
              <Badge variant="outline" className="border-siga-green-500 text-siga-green-600 dark:border-siga-green-dark dark:text-siga-green-dark">
                En Proceso
              </Badge>
              <Badge variant="secondary">
                Archivado
              </Badge>
              <Badge className="bg-siga-green-100 text-siga-green-700 dark:bg-siga-green-dark/20 dark:text-siga-green-dark">
                Completado
              </Badge>
              <Badge className="bg-siga-yellow-100 text-siga-yellow-700 dark:bg-siga-yellow-dark/20 dark:text-siga-yellow-dark">
                Revisión
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>
              Mensajes y notificaciones con colores SIGA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-siga-green-500 bg-siga-green-50 dark:border-siga-green-dark dark:bg-siga-green-dark/10">
              <CheckCircle2 className="h-4 w-4 text-siga-green-600 dark:text-siga-green-dark" />
              <AlertTitle className="text-siga-green-800 dark:text-siga-green-dark">Éxito</AlertTitle>
              <AlertDescription className="text-siga-green-700 dark:text-siga-green-dark/90">
                La operación se completó exitosamente.
              </AlertDescription>
            </Alert>

            <Alert className="border-siga-yellow-500 bg-siga-yellow-50 dark:border-siga-yellow-dark dark:bg-siga-yellow-dark/10">
              <AlertCircle className="h-4 w-4 text-siga-yellow-600 dark:text-siga-yellow-dark" />
              <AlertTitle className="text-siga-yellow-800 dark:text-siga-yellow-dark">Advertencia</AlertTitle>
              <AlertDescription className="text-siga-yellow-700 dark:text-siga-yellow-dark/90">
                Por favor revise los datos antes de continuar.
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Información</AlertTitle>
              <AlertDescription>
                Este es un mensaje informativo con colores neutros.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Color Scale */}
        <Card>
          <CardHeader>
            <CardTitle>Escala de Colores</CardTitle>
            <CardDescription>
              Variaciones de los colores principales para diferentes usos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Verde Scale */}
            <div>
              <h3 className="font-semibold mb-3">Escala Verde</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 bg-siga-green-${shade} rounded`} />
                    <span className="text-xs mt-1">{shade}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amarillo Scale */}
            <div>
              <h3 className="font-semibold mb-3">Escala Amarillo</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 bg-siga-yellow-${shade} rounded`} />
                    <span className="text-xs mt-1">{shade}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gris Scale */}
            <div>
              <h3 className="font-semibold mb-3">Escala Gris</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 bg-gray-${shade} rounded border`} />
                    <span className="text-xs mt-1">{shade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-siga-green/20 hover:border-siga-green/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-siga-green-600 dark:text-siga-green-dark">
                Card Verde
              </CardTitle>
              <CardDescription>
                Card con acento verde
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Este es un ejemplo de card con bordes y títulos verdes.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-siga-yellow-50 dark:bg-siga-yellow-dark/5">
            <CardHeader>
              <CardTitle className="text-siga-yellow-800 dark:text-siga-yellow-dark">
                Card Amarillo
              </CardTitle>
              <CardDescription>
                Card con fondo amarillo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Este es un ejemplo de card con fondo amarillo suave.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-siga-gray-50 dark:bg-siga-dark-elevated">
            <CardHeader>
              <CardTitle>Card Neutro</CardTitle>
              <CardDescription>
                Card con fondo gris perla
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Este es un ejemplo de card con fondo neutro.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
