'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function DialogflowWidget() {
  useEffect(() => {
    // Configurar el widget cuando el script se cargue
    if (typeof window !== 'undefined') {
      const checkAndConfigure = () => {
        const dfMessenger = document.querySelector('df-messenger');
        if (dfMessenger) {
          dfMessenger.setAttribute('intent', 'WELCOME');
          dfMessenger.setAttribute('chat-title', 'Asistente de Iniciativas');
        }
      };
      
      // Intentar configurar inmediatamente y después de un delay
      checkAndConfigure();
      setTimeout(checkAndConfigure, 1000);
    }
  }, []);

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"
        strategy="afterInteractive"
      />
      <df-messenger
        location="us-central1"
        project-id="insaight-backend"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        language-code="es"
        max-query-length="256"
      >
        <df-messenger-chat-bubble
          chat-title="Asistente IA"
        />
      </df-messenger>
      <style jsx global>{`
        df-messenger {
          z-index: 999;
          position: fixed;
          bottom: 20px;
          right: 20px;
          --df-messenger-bot-message: #374151;
          --df-messenger-button-titlebar-color: #6366f1;
          --df-messenger-button-titlebar-font-color: #ffffff;
          --df-messenger-chat-background-color: #1f2937;
          --df-messenger-font-color: #f3f4f6;
          --df-messenger-send-icon: #6366f1;
          --df-messenger-user-message: #6366f1;
          --df-messenger-user-message-font-color: #ffffff;
          --df-messenger-minimized-chat-close-icon-color: #f3f4f6;
          --df-messenger-input-box-color: #374151;
          --df-messenger-input-font-color: #f3f4f6;
          --df-messenger-input-placeholder-font-color: #9ca3af;
          --df-messenger-chat-border-radius: 16px;
        }
        
        df-messenger-chat-bubble {
          --df-messenger-chat-bubble-background: #6366f1;
          --df-messenger-chat-bubble-icon-color: #ffffff;
        }
        
        /* Ajustes para móvil */
        @media (max-width: 768px) {
          df-messenger {
            bottom: 70px;
            right: 10px;
          }
        }
      `}</style>
    </>
  );
}
