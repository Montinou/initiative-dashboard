'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, Book, MessageCircle, Mail } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Ayuda</h1>
        <p className="text-muted-foreground">
          Encuentra respuestas y obtén soporte
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Documentación
            </CardTitle>
            <CardDescription>
              Guías y tutoriales completos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Accede a la documentación completa del sistema para aprender sobre todas las funcionalidades.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Preguntas Frecuentes
            </CardTitle>
            <CardDescription>
              Respuestas a preguntas comunes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Encuentra respuestas rápidas a las preguntas más frecuentes sobre el uso del sistema.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Soporte
            </CardTitle>
            <CardDescription>
              Contacta con nuestro equipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para asistencia adicional, contacta a: soporte@siga.com
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            ¿Necesitas ayuda?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Atajos de teclado útiles:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded">K</kbd> - Búsqueda rápida</li>
              <li><kbd className="px-2 py-1 bg-muted rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded">/</kbd> - Mostrar atajos</li>
              <li><kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> - Cerrar diálogos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}