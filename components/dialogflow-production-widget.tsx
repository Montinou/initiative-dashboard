'use client';

import { useEffect } from 'react';

interface DialogflowProductionWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  expanded?: boolean;
}

/**
 * Dialogflow Production Widget
 * Usa exactamente el código proporcionado por Google Cloud Console
 */
export function DialogflowProductionWidget({ 
  position = 'bottom-right',
  expanded = false 
}: DialogflowProductionWidgetProps) {
  
  useEffect(() => {
    // Insertar el código exacto del Console
    if (typeof document !== 'undefined') {
      // Verificar si ya existe
      const existingMessenger = document.querySelector('df-messenger');
      if (existingMessenger) {
        return;
      }
      
      // Agregar CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
      document.head.appendChild(cssLink);
      
      // Agregar Script
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js';
      script.async = true;
      document.head.appendChild(script);
      
      // Esperar a que el script cargue
      script.onload = () => {
        // Crear el elemento df-messenger
        const messengerHTML = `
          <df-messenger
            location="us-central1"
            project-id="insaight-backend"
            agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
            language-code="es"
            max-query-length="-1">
            <df-messenger-chat-bubble
              chat-title="Initiative Assistant with Gemini 2.5">
            </df-messenger-chat-bubble>
          </df-messenger>
        `;
        
        // Insertar el HTML
        const container = document.createElement('div');
        container.innerHTML = messengerHTML;
        document.body.appendChild(container.firstElementChild as Element);
        
        // Agregar estilos
        const style = document.createElement('style');
        style.textContent = `
          df-messenger {
            z-index: 999;
            position: fixed;
            --df-messenger-font-color: #1f2937;
            --df-messenger-font-family: Google Sans, system-ui, sans-serif;
            --df-messenger-chat-background: #f9fafb;
            --df-messenger-message-user-background: #3b82f6;
            --df-messenger-message-bot-background: #e5e7eb;
            --df-messenger-bot-message: #1f2937;
            --df-messenger-user-message: #ffffff;
            --df-messenger-button-titlebar-color: #3b82f6;
            --df-messenger-button-titlebar-font-color: #ffffff;
            --df-messenger-chat-background-color: #ffffff;
            --df-messenger-send-icon: #3b82f6;
            --df-messenger-minimized-chat-close-icon-color: #ffffff;
            --df-messenger-input-box-color: #f3f4f6;
            --df-messenger-input-font-color: #1f2937;
            --df-messenger-input-placeholder-font-color: #6b7280;
            bottom: 16px;
            ${position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;'}
          }
          
          ${expanded ? `
            df-messenger {
              position: relative !important;
              width: 100% !important;
              height: 600px !important;
              bottom: auto !important;
              right: auto !important;
              left: auto !important;
            }
          ` : ''}
        `;
        document.head.appendChild(style);
      };
    }
    
    // Cleanup
    return () => {
      const messenger = document.querySelector('df-messenger');
      if (messenger) {
        messenger.remove();
      }
    };
  }, [position, expanded]);
  
  return null;
}

// Tipos TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': any;
      'df-messenger-chat-bubble': any;
    }
  }
}