'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { createClient } from '@/utils/supabase/client';

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
  const [sessionId, setSessionId] = useState<string>('');
  const [userContext, setUserContext] = useState<any>(null);
  
  const config = useMemo(() => {
    return {
      enabled: process.env.NEXT_PUBLIC_DF_ENABLED !== 'false',
      projectId: process.env.NEXT_PUBLIC_DF_PROJECT_ID?.trim(),
      agentId: process.env.NEXT_PUBLIC_DF_AGENT_ID?.trim(),
      location: process.env.NEXT_PUBLIC_DF_LOCATION?.trim() || 'us-central1',
      title: process.env.NEXT_PUBLIC_DF_TITLE?.trim() || 'Initiative Assistant AI',
    } as const;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!config.enabled) return;

    // Initialize session
    const initSession = async () => {
      try {
        // Get current user
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Create session mapping
          const response = await fetch('/api/ai/session-map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            setSessionId(data.sessionId);
            setUserContext(data);
            console.log('[Dialogflow] Session initialized:', data.sessionId);
          }
        }
      } catch (error) {
        console.error('[Dialogflow] Session init error:', error);
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        fetch('/api/ai/session-map', { method: 'DELETE' }).catch(() => {});
      }
    };
  }, [config.enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionId) return;

    const configure = () => {
      const el = document.querySelector('df-messenger') as HTMLElement | null;
      if (!el) return;

      // Set session and context
      el.setAttribute('session-id', sessionId);
      el.setAttribute('intent', 'WELCOME');
      el.setAttribute('chat-title', config.title);
      
      // Add session parameters for context
      if (userContext) {
        const params = {
          sessionId: sessionId,
          tenantId: userContext.tenant?.id,
          tenantName: userContext.tenant?.name,
          role: userContext.role,
          areaId: userContext.area?.id,
          areaName: userContext.area?.name
        };
        el.setAttribute('session-params', JSON.stringify(params));
      }

      const anyEl = el as any;
      const handler = (e: any) => {
        console.warn('Dialogflow Messenger error', e?.detail || e);
      };
      try {
        anyEl.addEventListener?.('df-request-error', handler);
        anyEl.addEventListener?.('error', handler);
        
        // Add session context to requests
        anyEl.addEventListener?.('df-request-sent', (e: any) => {
          if (e.detail?.data) {
            e.detail.data.sessionId = sessionId;
            e.detail.data.userContext = userContext;
          }
        });
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
  }, [config.title, sessionId, userContext]);

  if (!config.enabled || !config.projectId || !config.agentId) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('DialogflowWidget disabled or misconfigured. Set NEXT_PUBLIC_DF_ENABLED, NEXT_PUBLIC_DF_PROJECT_ID, NEXT_PUBLIC_DF_AGENT_ID.');
    }
    return null;
  }

  // Don't render until session is ready
  if (!sessionId) {
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
          session-id={sessionId as any}
          language-code="es"
          max-query-length="256"
          enable-audio-input="true"
          enable-file-upload="true"
        >
          <df-messenger-chat-bubble 
            chat-title={config.title as any}
            chat-subtitle={userContext ? `${userContext.tenant?.name} - ${userContext.role}` : ''}
          />
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
        
        /* Dark mode adjustments */
        .dark df-messenger {
          --df-messenger-chat-background-color: #111827;
          --df-messenger-bot-message: #1f2937;
          --df-messenger-input-box-color: #1f2937;
        }
        
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