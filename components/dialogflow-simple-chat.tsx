'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function DialogflowSimpleChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! 👋 Soy tu asistente de iniciativas potenciado por Gemini 2.5 Flash Lite. Puedo ayudarte con:\n\n• Ver el estado de tus iniciativas\n• Analizar el progreso de objetivos\n• Sugerir nuevas iniciativas basadas en ML\n• Predecir el éxito de proyectos\n\n¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simular respuesta del bot
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(input),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getBotResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('iniciativa') || lowerQuery.includes('proyecto')) {
      return '📊 Analizando datos de iniciativas...\n\nActualmente tienes 12 iniciativas activas:\n• 5 en progreso (42%)\n• 3 completadas (25%)\n• 4 pendientes (33%)\n\nLas áreas con mejor desempeño son Tecnología (85% completado) y Marketing (72% completado).\n\n💡 Sugerencia: Basándome en patrones históricos, recomiendo lanzar la "Campaña Q2 2025" la próxima semana para maximizar el impacto.';
    }
    
    if (lowerQuery.includes('objetivo') || lowerQuery.includes('okr')) {
      return '🎯 Estado de Objetivos Q1 2025:\n\n1. **Aumentar satisfacción del cliente**\n   Progreso: 65% | Tendencia: ↗️ Positiva\n\n2. **Optimizar procesos internos**\n   Progreso: 48% | Tendencia: → Estable\n\n3. **Expandir mercado digital**\n   Progreso: 72% | Tendencia: ↗️ Positiva\n\n⚠️ El objetivo #2 necesita atención. ¿Quieres que sugiera iniciativas para mejorarlo?';
    }
    
    if (lowerQuery.includes('sugerir') || lowerQuery.includes('recomendar')) {
      return '🤖 Basándome en el análisis de ML, sugiero estas iniciativas:\n\n1. **"Automatización de Reportes"**\n   • ROI estimado: 320%\n   • Duración: 6 semanas\n   • Probabilidad de éxito: 87%\n\n2. **"Programa de Fidelización Digital"**\n   • ROI estimado: 250%\n   • Duración: 8 semanas\n   • Probabilidad de éxito: 82%\n\nEstas sugerencias se basan en iniciativas similares exitosas y la capacidad actual del equipo.';
    }
    
    if (lowerQuery.includes('ayuda') || lowerQuery.includes('help')) {
      return '🆘 Puedo ayudarte con:\n\n📊 **Análisis**: "Muéstrame el progreso general"\n🎯 **Objetivos**: "Estado de los OKRs"\n💡 **Sugerencias**: "Sugiere nuevas iniciativas"\n📈 **Tendencias**: "Analiza tendencias del trimestre"\n👥 **Equipos**: "Carga de trabajo por área"\n\n¿Qué te gustaría explorar?';
    }
    
    return '🤔 Interesante pregunta. Como asistente de iniciativas, puedo ayudarte mejor con:\n• Análisis de iniciativas y objetivos\n• Sugerencias basadas en ML\n• Métricas de progreso\n• Predicciones de éxito\n\n¿Hay algo específico sobre tus iniciativas que quieras saber?';
  };

  const sampleQuestions = [
    "¿Cuál es el estado de las iniciativas?",
    "Sugiere nuevas iniciativas",
    "Muestra los objetivos del trimestre",
    "¿Qué área necesita más apoyo?"
  ];

  return (
    <div className="w-full h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold">AI Assistant - Gemini 2.5 Flash Lite</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => window.open('https://dialogflow.cloud.google.com/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/test', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Test Agent
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 bg-gray-50" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                }`}>
                  {message.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border shadow-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border rounded-lg p-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sample Questions */}
      <div className="p-2 bg-white border-t">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sampleQuestions.map((question, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              className="text-xs whitespace-nowrap"
              onClick={() => setInput(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t rounded-b-lg">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Demostración del chat. Para el agente real, abre el{' '}
          <a 
            href="https://dialogflow.cloud.google.com/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/test"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Test Agent en Dialogflow Console
          </a>
        </p>
      </div>
    </div>
  );
}