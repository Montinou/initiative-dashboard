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
        
        // Agregar estilos mejorados
        const style = document.createElement('style');
        style.textContent = `
          df-messenger {
            z-index: 999;
            position: fixed;
            --df-messenger-font-color: #1f2937;
            --df-messenger-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
            --df-messenger-chat-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --df-messenger-message-user-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --df-messenger-message-bot-background: #ffffff;
            --df-messenger-bot-message: #1f2937;
            --df-messenger-user-message: #ffffff;
            --df-messenger-button-titlebar-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --df-messenger-button-titlebar-font-color: #ffffff;
            --df-messenger-chat-background-color: #f8fafc;
            --df-messenger-send-icon: #667eea;
            --df-messenger-minimized-chat-close-icon-color: #ffffff;
            --df-messenger-input-box-color: #ffffff;
            --df-messenger-input-font-color: #1f2937;
            --df-messenger-input-placeholder-font-color: #64748b;
            --df-messenger-chat-bubble-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --df-messenger-chat-bubble-font-color: #ffffff;
            --df-messenger-chat-bubble-icon-color: #ffffff;
            bottom: 24px;
            ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
          }
          
          /* Mejorar el chat bubble (botón flotante) */
          df-messenger-chat-bubble {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
            border-radius: 24px !important;
          }
          
          df-messenger-chat-bubble:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
          }
          
          /* Mejorar el diálogo del chat */
          df-messenger-chat {
            border-radius: 16px !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          
          /* Mejorar la barra de título */
          df-messenger-titlebar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 16px !important;
          }
          
          /* Mejorar los mensajes */
          df-messenger-message-list {
            padding: 12px !important;
          }
          
          df-messenger-message {
            margin: 8px 0 !important;
          }
          
          /* Mensajes del usuario */
          df-messenger-user-message {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            border-radius: 18px 18px 4px 18px !important;
            padding: 12px 16px !important;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }
          
          /* Mensajes del bot */
          df-messenger-bot-message {
            background: white !important;
            color: #1f2937 !important;
            border-radius: 18px 18px 18px 4px !important;
            padding: 12px 16px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
          }
          
          /* Input del mensaje */
          df-messenger-input-box {
            border-radius: 24px !important;
            border: 2px solid #e5e7eb !important;
            padding: 12px 16px !important;
            margin: 12px !important;
            transition: all 0.3s ease;
          }
          
          df-messenger-input-box:focus-within {
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          
          /* Botón de enviar */
          df-messenger-send-icon {
            color: #667eea !important;
            transition: all 0.2s ease;
          }
          
          df-messenger-send-icon:hover {
            transform: scale(1.1);
          }
          
          /* Animaciones suaves */
          df-messenger * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Scrollbar personalizado */
          df-messenger-message-list::-webkit-scrollbar {
            width: 6px;
          }
          
          df-messenger-message-list::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          
          df-messenger-message-list::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 3px;
          }
          
          df-messenger-message-list::-webkit-scrollbar-thumb:hover {
            background: #764ba2;
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