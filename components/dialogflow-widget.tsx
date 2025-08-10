'use client';

import { useEffect, useMemo } from 'react';
import Script from 'next/script';

// Allow custom elements in TSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': any;
      'df-messenger-chat-bubble': any;
    }
  }
}

export function DialogflowWidget() {
  const config = useMemo(() => {
    return {
      enabled: process.env.NEXT_PUBLIC_DF_ENABLED !== 'false',
      projectId: process.env.NEXT_PUBLIC_DF_PROJECT_ID?.trim(),
      agentId: process.env.NEXT_PUBLIC_DF_AGENT_ID?.trim(),
      location: process.env.NEXT_PUBLIC_DF_LOCATION?.trim() || 'us-central1',
      title: process.env.NEXT_PUBLIC_DF_TITLE?.trim() || 'Asistente de Iniciativas',
    } as const;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const configure = () => {
      const el = document.querySelector('df-messenger') as HTMLElement | null;
      if (!el) return;

      el.setAttribute('intent', 'WELCOME');
      el.setAttribute('chat-title', config.title);

      const anyEl = el as any;
      const handler = (e: any) => {
        console.warn('Dialogflow Messenger error', e?.detail || e);
      };
      try {
        anyEl.addEventListener?.('df-request-error', handler);
        anyEl.addEventListener?.('error', handler);
      } catch {}
      return () => {
        try {
          anyEl.removeEventListener?.('df-request-error', handler);
          anyEl.removeEventListener?.('error', handler);
        } catch {}
      };
    };

    const cleanup = configure();
    const t = setTimeout(configure, 1000);
    return () => {
      cleanup?.();
      clearTimeout(t);
    };
  }, [config.title]);

  if (!config.enabled || !config.projectId || !config.agentId) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('DialogflowWidget disabled or misconfigured. Set NEXT_PUBLIC_DF_ENABLED, NEXT_PUBLIC_DF_PROJECT_ID, NEXT_PUBLIC_DF_AGENT_ID.');
    }
    return null;
  }

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"
        strategy="afterInteractive"
        id="df-messenger-bootstrap"
      />
      {/* Suppress TS typing by casting to any */}
      {(
        <df-messenger
          location={config.location as any}
          project-id={config.projectId as any}
          agent-id={config.agentId as any}
          language-code="es"
          max-query-length="256"
        >
          <df-messenger-chat-bubble chat-title={config.title as any} />
        </df-messenger>
      ) as any}
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
        @media (max-width: 768px) {
          df-messenger { bottom: 70px; right: 10px; }
        }
      `}</style>
    </>
  );
}
