'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface DialogflowChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  expanded?: boolean;
}

export function DialogflowChatWidget({ 
  position = 'bottom-right',
  expanded = false 
}: DialogflowChatWidgetProps) {
  useEffect(() => {
    // Configuración del widget
    if (typeof window !== 'undefined') {
      (window as any).dfMessengerConfig = {
        agentId: '7f297240-ca50-4896-8b71-e82fd707fa88',
        location: 'us-central1',
        projectId: 'insaight-backend',
        languageCode: 'es',
        welcomeMessage: '¡Hola! Soy tu asistente de gestión de iniciativas. Puedo ayudarte con información sobre proyectos, objetivos, actividades y más. ¿En qué puedo ayudarte?',
        expanded: expanded,
        position: position === 'bottom-right' ? 'RIGHT' : 'LEFT',
        botTitle: 'Asistente IA',
        botAvatar: '/bot-avatar.png', // Opcional: agregar un avatar
        userAvatar: '/user-avatar.png', // Opcional: avatar del usuario
        themeColor: '#3B82F6', // Color principal del tema
        font: 'system-ui, sans-serif'
      };
    }
  }, [expanded, position]);

  return (
    <>
      {/* Cargar el script de Dialogflow Messenger */}
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"
        strategy="afterInteractive"
      />
      
      {/* El componente del chat */}
      <df-messenger
        intent="WELCOME"
        chat-title="Asistente de Iniciativas"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        location="us-central1"
        project-id="insaight-backend"
        language-code="es"
        max-query-length="256"
      >
        <style>{`
          df-messenger {
            --df-messenger-bot-message: #f3f4f6;
            --df-messenger-button-titlebar-color: #3b82f6;
            --df-messenger-chat-background-color: #fafafa;
            --df-messenger-font-color: white;
            --df-messenger-send-icon: #3b82f6;
            --df-messenger-user-message: #3b82f6;
            --df-messenger-minimized-chat-close-icon-color: #fff;
            z-index: 999;
          }
        `}</style>
      </df-messenger>
    </>
  );
}

// Declaración de tipos para el elemento personalizado
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': any;
    }
  }
}