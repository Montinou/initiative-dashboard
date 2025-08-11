'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

interface DialogflowMessengerProps {
  className?: string;
  expand?: boolean;
  projectId?: string;
  agentId?: string;
  location?: string;
  languageCode?: string;
}

export function DialogflowMessenger({ className, expand = false, projectId, agentId, location, languageCode = 'es' }: DialogflowMessengerProps) {
  const PROJECT_ID = projectId || process.env.NEXT_PUBLIC_DF_PROJECT_ID;
  const AGENT_ID = agentId || process.env.NEXT_PUBLIC_DF_AGENT_ID;
  const LOCATION = location || process.env.NEXT_PUBLIC_DF_LOCATION || 'us-central1';

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

  // Si falta configuración, no renderizamos para evitar errores de consola
  if (!PROJECT_ID || !AGENT_ID) {
    if (typeof window !== 'undefined') {
      console.warn('Dialogflow Messenger no renderizado: faltan NEXT_PUBLIC_DF_PROJECT_ID o NEXT_PUBLIC_DF_AGENT_ID');
    }
    return null;
  }

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
      />
      {React.createElement(
        'df-messenger' as any,
        {
          location: LOCATION,
          'project-id': PROJECT_ID,
          'agent-id': AGENT_ID,
          'language-code': languageCode,
          'max-query-length': '-1',
          expand: expand ? 'true' : 'false',
          className,
        } as any,
        React.createElement('df-messenger-chat-bubble' as any, {
          'chat-title': 'Initiative Assistant with Gemini 2.5',
        } as any)
      )}
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
