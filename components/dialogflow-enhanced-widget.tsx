'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface DialogflowEnhancedWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  expanded?: boolean;
}

export function DialogflowEnhancedWidget({ 
  position = 'bottom-right',
  expanded = false 
}: DialogflowEnhancedWidgetProps) {
  
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
        expand={expanded ? "true" : "false"}
        chat-icon="https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/chat_bubble/default/48px.svg"
      >
        <df-messenger-chat-bubble
          chat-title="AI Assistant"
        />
      </df-messenger>
      
      <style jsx global>{`
        /* Variables principales de personalización */
        df-messenger {
          z-index: 9999;
          position: fixed;
          bottom: 24px;
          ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
          
          /* Colores principales */
          --df-messenger-primary-color: #6366f1;
          --df-messenger-primary-color-dark: #4f46e5;
          
          /* Tipografía moderna */
          --df-messenger-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif;
          --df-messenger-font-color: #1e293b;
          
          /* Colores del chat */
          --df-messenger-chat-background: #ffffff;
          --df-messenger-chat-background-color: #ffffff;
          
          /* Mensajes del usuario - Gradiente moderno */
          --df-messenger-message-user-background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          --df-messenger-user-message: #ffffff;
          --df-messenger-user-message-color: #ffffff;
          
          /* Mensajes del bot - Estilo limpio */
          --df-messenger-message-bot-background: #f1f5f9;
          --df-messenger-bot-message: #334155;
          --df-messenger-bot-message-background: #f1f5f9;
          
          /* Barra de título - Gradiente elegante */
          --df-messenger-button-titlebar-color: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          --df-messenger-button-titlebar-font-color: #ffffff;
          --df-messenger-titlebar-font-color: #ffffff;
          
          /* Input box - Diseño moderno */
          --df-messenger-input-box-color: #ffffff;
          --df-messenger-input-font-color: #1e293b;
          --df-messenger-input-placeholder-font-color: #94a3b8;
          --df-messenger-input-border-color: #e2e8f0;
          --df-messenger-input-focus-border-color: #6366f1;
          
          /* Botón de enviar */
          --df-messenger-send-icon: #6366f1;
          --df-messenger-send-icon-active: #4f46e5;
          
          /* Chat bubble (botón flotante) */
          --df-messenger-chat-bubble-background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          --df-messenger-chat-bubble-font-color: #ffffff;
          --df-messenger-chat-bubble-icon-color: #ffffff;
          --df-messenger-minimized-chat-close-icon-color: #ffffff;
          
          /* Chips/Sugerencias */
          --df-messenger-chip-background: #ffffff;
          --df-messenger-chip-border-color: #e2e8f0;
          --df-messenger-chip-font-color: #475569;
          --df-messenger-chip-hover-background: #f8fafc;
          
          /* Links */
          --df-messenger-link-color: #6366f1;
          --df-messenger-link-hover-color: #4f46e5;
          
          /* Sombras y bordes */
          --df-messenger-chat-border-radius: 16px;
          --df-messenger-message-border-radius: 12px;
        }
        
        /* Estilos adicionales para mejorar la apariencia */
        df-messenger::part(chat-wrapper) {
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        
        /* Chat bubble con animación */
        df-messenger-chat-bubble {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        df-messenger-chat-bubble:hover {
          transform: scale(1.05);
          transition: transform 0.2s ease;
        }
        
        /* Mejorar el diálogo expandido */
        df-messenger[expand="true"] {
          ${expanded ? `
            position: relative !important;
            width: 100% !important;
            height: 600px !important;
            max-width: 420px;
            bottom: auto !important;
            right: auto !important;
            left: auto !important;
          ` : ''}
        }
        
        /* Animación de entrada */
        df-messenger-chat {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Mejorar la barra de título */
        df-messenger::part(title-bar) {
          padding: 16px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }
        
        /* Estilo para los mensajes */
        df-messenger::part(message-list) {
          padding: 16px;
          background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
        }
        
        /* Mensajes del usuario */
        df-messenger::part(user-message) {
          margin: 8px 0;
          padding: 12px 16px;
          border-radius: 18px 18px 4px 18px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
        }
        
        /* Mensajes del bot */
        df-messenger::part(bot-message) {
          margin: 8px 0;
          padding: 12px 16px;
          border-radius: 18px 18px 18px 4px;
          background: #f1f5f9;
          color: #334155;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        
        /* Input de texto */
        df-messenger::part(input-wrapper) {
          padding: 12px;
          border-top: 1px solid #e2e8f0;
          background: #fafafa;
        }
        
        df-messenger::part(input-box) {
          border-radius: 24px;
          border: 2px solid #e2e8f0;
          padding: 12px 20px;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        df-messenger::part(input-box):focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          outline: none;
        }
        
        /* Botón de enviar */
        df-messenger::part(send-button) {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: transparent;
          transition: all 0.2s ease;
        }
        
        df-messenger::part(send-button):hover {
          background: rgba(99, 102, 241, 0.1);
          transform: scale(1.1);
        }
        
        /* Chips de sugerencias */
        df-messenger::part(chip) {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        df-messenger::part(chip):hover {
          background: #f8fafc;
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        /* Scrollbar personalizado */
        df-messenger::part(message-list)::-webkit-scrollbar {
          width: 6px;
        }
        
        df-messenger::part(message-list)::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        
        df-messenger::part(message-list)::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        df-messenger::part(message-list)::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
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