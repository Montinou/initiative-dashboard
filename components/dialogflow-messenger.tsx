'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'intent'?: string;
        'chat-title'?: string;
        'agent-id'?: string;
        'location'?: string;
        'language-code'?: string;
        'expand'?: string;
        'chat-icon'?: string;
        'project-id'?: string;
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
  }, []);

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"
        strategy="afterInteractive"
      />
      <df-messenger
        project-id="insaight-backend"
        intent="WELCOME"
        chat-title="Initiative Assistant"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        location="us-central1"
        language-code="es"
        expand={expand ? "true" : "false"}
        className={className}
      >
        <style jsx global>{`
          df-messenger {
            --df-messenger-bot-message: #f3f4f6;
            --df-messenger-button-titlebar-color: #3b82f6;
            --df-messenger-chat-background-color: #ffffff;
            --df-messenger-font-color: #1f2937;
            --df-messenger-send-icon: #3b82f6;
            --df-messenger-user-message: #3b82f6;
            --df-messenger-user-message-color: #ffffff;
            --df-messenger-minimized-chat-close-icon-color: #ffffff;
            z-index: 999;
            position: fixed;
            bottom: 20px;
            right: 20px;
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
      </df-messenger>
    </>
  );
}
