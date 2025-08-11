'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { createHash } from 'crypto';

interface DialogflowMessengerSecureProps {
  className?: string;
  expand?: boolean;
  projectId?: string;
  agentId?: string;
  location?: string;
  languageCode?: string;
  userId?: string;
  tenantId?: string;
  role?: string;
}

export function DialogflowMessengerSecure({ 
  className, 
  expand = false, 
  projectId, 
  agentId, 
  location, 
  languageCode = 'es',
  userId,
  tenantId,
  role
}: DialogflowMessengerSecureProps) {
  const PROJECT_ID = projectId || process.env.NEXT_PUBLIC_DF_PROJECT_ID;
  const AGENT_ID = agentId || process.env.NEXT_PUBLIC_DF_AGENT_ID;
  const LOCATION = location || process.env.NEXT_PUBLIC_DF_LOCATION || 'us-central1';
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Create or retrieve session mapping
        const response = await fetch('/api/ai/session-map', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          setSessionData(data);
          console.log('[Dialogflow] Session initialized:', data.sessionId);
        } else {
          console.error('[Dialogflow] Failed to initialize session');
        }
      } catch (error) {
        console.error('[Dialogflow] Error initializing session:', error);
      }
    };

    // Initialize session if user is authenticated
    if (userId || typeof window !== 'undefined') {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      const existingMessenger = document.querySelector('df-messenger');
      if (existingMessenger && existingMessenger.parentNode) {
        existingMessenger.parentNode.removeChild(existingMessenger);
      }
    };
  }, [userId]);

  // Add CSS theme
  useEffect(() => {
    if (!document.querySelector('link[href*="df-messenger-default.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
      document.head.appendChild(link);
    }
  }, []);

  // Si falta configuración o session, no renderizamos
  if (!PROJECT_ID || !AGENT_ID || !sessionId) {
    if (typeof window !== 'undefined' && (!PROJECT_ID || !AGENT_ID)) {
      console.warn('Dialogflow Messenger no renderizado: faltan NEXT_PUBLIC_DF_PROJECT_ID o NEXT_PUBLIC_DF_AGENT_ID');
    }
    return null;
  }

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[Dialogflow] Script loaded successfully');
          
          // Configure session parameters
          const messenger = document.querySelector('df-messenger') as any;
          if (messenger && messenger.setSessionParams) {
            messenger.setSessionParams({
              sessionId: sessionId,
              userContext: {
                tenantId: sessionData?.tenant?.id,
                tenantName: sessionData?.tenant?.name,
                role: sessionData?.role,
                areaId: sessionData?.area?.id,
                areaName: sessionData?.area?.name
              }
            });
          }
        }}
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
          'session-id': sessionId,
          'enable-audio-input': 'true',
          'enable-file-upload': 'true',
          'enable-generative': 'true',
          className,
          // Session parameters for context
          'session-params': JSON.stringify({
            sessionId: sessionId,
            tenantId: sessionData?.tenant?.id,
            role: sessionData?.role
          })
        } as any,
        React.createElement('df-messenger-chat-bubble' as any, {
          'chat-title': 'Initiative Assistant AI',
          'chat-subtitle': sessionData ? `${sessionData.tenant?.name} - ${sessionData.role}` : 'Powered by Gemini'
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
          --df-messenger-primary-color: #6366f1;
          --df-messenger-button-background: #6366f1;
          --df-messenger-button-background-hover: #5558dd;
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

        /* Dark mode support */
        .dark df-messenger {
          --df-messenger-font-color: #fff;
          --df-messenger-chat-background: #1e293b;
          --df-messenger-message-user-background: #3730a3;
          --df-messenger-message-bot-background: #334155;
        }
      `}</style>
    </>
  );
}