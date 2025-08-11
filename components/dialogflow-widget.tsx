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
      [elemName: string]: any; // allow any custom element
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
      title: process.env.NEXT_PUBLIC_DF_TITLE?.trim() || 'Initiative Assistant with Gemini 2.5',
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

  // Alias custom elements to avoid TSX intrinsic element typing issues
  const DfMessenger: any = 'df-messenger';
  const DfChatBubble: any = 'df-messenger-chat-bubble';

  return (
    <>
      {/* Load the official df-messenger assets and default theme as requested */}
      <link
        rel="stylesheet"
        href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css"
      />
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
        id="df-messenger-script"
      />
      <DfMessenger
        location={config.location}
        project-id={config.projectId}
        agent-id={config.agentId}
        session-id={sessionId}
        language-code="es"
        max-query-length={-1}
      >
        <DfChatBubble 
          chat-title={config.title}
          chat-subtitle={userContext ? `${userContext.tenant?.name} - ${userContext.role}` : ''}
        />
      </DfMessenger>
      <style jsx global>{`
        df-messenger {
          z-index: 999;
          position: fixed;
          bottom: 16px;
          right: 16px;
          --df-messenger-font-color: #000;
          --df-messenger-font-family: Google Sans;
          --df-messenger-chat-background: #f3f6fc;
          --df-messenger-message-user-background: #d3e3fd;
          --df-messenger-message-bot-background: #fff;
        }
      `}</style>
    </>
  );
}