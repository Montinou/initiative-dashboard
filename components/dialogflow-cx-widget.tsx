'use client';

import { useEffect } from 'react';

interface DialogflowCXWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  expanded?: boolean;
}

export function DialogflowCXWidget({ 
  position = 'bottom-right',
  expanded = false 
}: DialogflowCXWidgetProps) {
  useEffect(() => {
    // Dynamically load the Dialogflow Messenger script
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js';
    script.async = true;
    
    // Add CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
    
    document.head.appendChild(link);
    document.body.appendChild(script);
    
    // Cleanup
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
      // Remove the df-messenger element if it exists
      const messenger = document.querySelector('df-messenger');
      if (messenger && messenger.parentNode) {
        messenger.parentNode.removeChild(messenger);
      }
    };
  }, []);
  
  useEffect(() => {
    // Wait for script to load then create the element
    const checkAndCreateMessenger = () => {
      if (typeof window !== 'undefined' && (window as any).dfMessenger) {
        // Remove existing messenger if any
        const existingMessenger = document.querySelector('df-messenger');
        if (existingMessenger) {
          existingMessenger.remove();
        }
        
        // Create new messenger element
        const messenger = document.createElement('df-messenger');
        messenger.setAttribute('location', 'us-central1');
        messenger.setAttribute('project-id', 'insaight-backend');
        messenger.setAttribute('agent-id', '7f297240-ca50-4896-8b71-e82fd707fa88');
        messenger.setAttribute('language-code', 'es');
        messenger.setAttribute('max-query-length', '-1');
        
        // Create chat bubble element
        const chatBubble = document.createElement('df-messenger-chat-bubble');
        chatBubble.setAttribute('chat-title', 'Initiative Assistant with Gemini 2.5');
        
        messenger.appendChild(chatBubble);
        document.body.appendChild(messenger);
        
        // Apply styles
        const style = document.createElement('style');
        style.textContent = `
          df-messenger {
            z-index: 999;
            position: fixed;
            --df-messenger-font-color: #000;
            --df-messenger-font-family: Google Sans, system-ui, sans-serif;
            --df-messenger-chat-background: #f3f6fc;
            --df-messenger-message-user-background: #d3e3fd;
            --df-messenger-message-bot-background: #fff;
            bottom: 16px;
            ${position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;'}
          }
          
          ${expanded ? `
            df-messenger {
              position: relative !important;
              width: 100% !important;
              height: 600px !important;
              bottom: auto !important;
              right: auto !important;
              left: auto !important;
            }
          ` : ''}
        `;
        document.head.appendChild(style);
      } else {
        // Retry after a short delay
        setTimeout(checkAndCreateMessenger, 100);
      }
    };
    
    // Start checking after a delay to ensure script is loaded
    const timer = setTimeout(checkAndCreateMessenger, 500);
    
    return () => clearTimeout(timer);
  }, [position, expanded]);
  
  return null; // This component doesn't render anything directly
}

// Declaración de tipos para el elemento personalizado
declare global {
  interface Window {
    dfMessenger?: any;
  }
  
  namespace JSX {
    interface IntrinsicElements {
      'df-messenger': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'location'?: string;
        'project-id'?: string;
        'agent-id'?: string;
        'language-code'?: string;
        'max-query-length'?: string;
      }, HTMLElement>;
      'df-messenger-chat-bubble': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'chat-title'?: string;
      }, HTMLElement>;
    }
  }
}