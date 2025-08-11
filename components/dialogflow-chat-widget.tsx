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
    // Add CSS link to head
    if (typeof document !== 'undefined') {
      const existingLink = document.querySelector('link[href*="df-messenger-default.css"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <>
      {/* Cargar el script de Dialogflow Messenger */}
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
      />
      
      {/* El componente del chat */}
      <df-messenger
        location="us-central1"
        project-id="insaight-backend"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        language-code="es"
        max-query-length="-1"
      >
        <df-messenger-chat-bubble
          chat-title="Initiative Assistant with Gemini 2.5"
        />
      </df-messenger>
      
      <style jsx global>{`
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
            position: relative;
            width: 100%;
            height: 600px;
            bottom: auto;
            right: auto;
            left: auto;
          }
        ` : ''}
      `}</style>
    </>
  );
}

// Declaración de tipos para el elemento personalizado
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': any;
      'df-messenger-chat-bubble': any;
    }
  }
}