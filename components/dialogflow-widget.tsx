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
          --df-messenger-bot-message: #f0f0f0;
          --df-messenger-button-titlebar-color: #0066cc;
          --df-messenger-button-titlebar-font-color: #ffffff;
          --df-messenger-chat-background-color: #ffffff;
          --df-messenger-font-color: #000000;
          --df-messenger-send-icon: #0066cc;
          --df-messenger-user-message: #0066cc;
          --df-messenger-user-message-font-color: #ffffff;
          --df-messenger-minimized-chat-close-icon-color: #ffffff;
          --df-messenger-input-box-color: #ffffff;
          --df-messenger-input-font-color: #000000;
          --df-messenger-input-placeholder-font-color: #757575;
        }
        
        df-messenger-chat-bubble {
          --df-messenger-chat-bubble-background: #0066cc;
          --df-messenger-chat-bubble-icon-color: #ffffff;
        }
      `}</style>
    </>
  );
}
