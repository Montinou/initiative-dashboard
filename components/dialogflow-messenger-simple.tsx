'use client';

import { useEffect, useRef } from 'react';

export function DialogflowMessengerSimple() {
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // Evitar cargar múltiples veces
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    // Función para cargar el widget
    const loadDialogflow = () => {
      // Verificar si ya existe el widget
      if (document.querySelector('df-messenger')) {
        return;
      }
      
      // Crear el contenedor del widget
      const container = document.createElement('div');
      container.id = 'dialogflow-container';
      container.innerHTML = `
        <link rel="stylesheet" href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css">
        <script src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"></script>
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
        <style>
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
            right: 16px;
          }
        </style>
      `;
      
      // Agregar al body
      document.body.appendChild(container);
    };
    
    // Cargar después de que el DOM esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(loadDialogflow, 100);
    } else {
      window.addEventListener('DOMContentLoaded', loadDialogflow);
    }
    
    // Cleanup
    return () => {
      const container = document.getElementById('dialogflow-container');
      if (container) {
        container.remove();
      }
    };
  }, []);
  
  return null;
}