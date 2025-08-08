'use client'

import { useState } from 'react'
import { StratixAssistantClient } from '@/components/stratix/stratix-assistant-client'
import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'

export default function TestAIPage() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Test del Asistente IA con Gemini</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Información</h2>
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <p>Este es un entorno de prueba para el asistente de IA integrado con Google Gemini 2.0 Flash.</p>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Características:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Conversación en tiempo real con streaming</li>
                <li>Contexto del usuario (nombre, rol, área)</li>
                <li>Acceso a datos de Supabase según permisos RLS</li>
                <li>Análisis de iniciativas y objetivos</li>
                <li>Sugerencias de preguntas inteligentes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Prueba estas preguntas:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>¿Cuál es mi rol en el sistema?</li>
                <li>¿Cuántas iniciativas tengo en mi área?</li>
                <li>¿Cuáles son los objetivos más importantes?</li>
                <li>Dame un análisis de las actividades retrasadas</li>
                <li>¿Qué puedo hacer para mejorar el progreso?</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              size="lg"
              className="w-full"
            >
              <Bot className="h-5 w-5 mr-2" />
              {isAssistantOpen ? 'Cerrar Asistente' : 'Abrir Asistente Flotante'}
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Asistente Embebido</h2>
          <StratixAssistantClient position="embedded" />
        </div>
      </div>

      {/* Floating Assistant */}
      {isAssistantOpen && (
        <StratixAssistantClient 
          position="floating" 
          isOpen={true}
          onClose={() => setIsAssistantOpen(false)}
        />
      )}
    </div>
  )
}