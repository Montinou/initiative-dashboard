'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'location'?: string;
        'project-id'?: string;
        'agent-id'?: string;
        'language-code'?: string;
        'max-query-length'?: string;
        'expand'?: string;
      }, HTMLElement>;
      'df-messenger-chat-bubble': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'chat-title'?: string;
      }, HTMLElement>;
    }
  }
}

interface DialogflowMessengerProps {
  className?: string;
  expand?: boolean;
}

export function DialogflowMessenger({ className, expand = false }: DialogflowMessengerProps) {
  useEffect(() => {
    // Limpiar cualquier instancia previa
    const existingMessenger = document.querySelector('df-messenger');
    if (existingMessenger && existingMessenger.parentNode) {
      existingMessenger.parentNode.removeChild(existingMessenger);
    }

    // Agregar el CSS de tema por defecto
    if (!document.querySelector('link[href*="df-messenger-default.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
      />
      <df-messenger
        location="us-central1"
        project-id="insaight-backend"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        language-code="es"
        max-query-length="-1"
        expand={expand ? "true" : "false"}
        className={className}
      >
        <df-messenger-chat-bubble
          chat-title="Initiative Assistant with Gemini 2.5"
        />
      </df-messenger>
      <style jsx global>{`
        df-messenger {
          z-index: 999;
          position: fixed;
          --df-messenger-font-color: #000;
          --df-messenger-font-family: 'Google Sans', 'Helvetica Neue', sans-serif;
          --df-messenger-chat-background: #f3f6fc;
          --df-messenger-message-user-background: #d3e3fd;
          --df-messenger-message-bot-background: #fff;
          bottom: 16px;
          right: 16px;
        }
        
        df-messenger[expand="true"] {
          position: relative;
          width: 100%;
          height: 600px;
          bottom: auto;
          right: auto;
        }
        
        df-messenger .df-messenger-wrapper {
          height: 100% !important;
        }
      `}</style>
    </>
  );
}
