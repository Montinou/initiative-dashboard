'use client';

import { useEffect, useState } from 'react';

interface DialogflowIframeWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
}

export function DialogflowIframeWidget({ position = 'bottom-right' }: DialogflowIframeWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Crear un HTML autónomo para el iframe
    const iframeContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css">
        <style>
          body { margin: 0; padding: 0; }
          df-messenger {
            position: fixed;
            width: 100%;
            height: 100%;
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
          }
        </style>
      </head>
      <body>
        <df-messenger
          location="us-central1"
          project-id="insaight-backend"
          agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
          language-code="es"
          max-query-length="-1"
          expand="true">
          <df-messenger-chat-bubble
            chat-title="Initiative Assistant">
          </df-messenger-chat-bubble>
        </df-messenger>
        <script src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"></script>
      </body>
      </html>
    `;
    
    // Crear el iframe si está abierto
    if (isOpen) {
      const iframe = document.getElementById('dialogflow-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.srcdoc = iframeContent;
      }
    }
  }, [isOpen]);
  
  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed z-50 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors ${
            position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'
          }`}
          aria-label="Abrir chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
      
      {/* Ventana del chat en iframe */}
      {isOpen && (
        <div className={`fixed z-50 ${
          position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
              <span className="font-semibold">Initiative Assistant</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 rounded p-1"
                aria-label="Cerrar chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <iframe
              id="dialogflow-iframe"
              className="w-96 h-[600px]"
              title="Dialogflow Chat"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      )}
    </>
  );
}