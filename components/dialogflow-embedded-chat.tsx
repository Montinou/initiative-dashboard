'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';

interface DialogflowEmbeddedChatProps {
  embedded?: boolean;
}

export function DialogflowEmbeddedChat({ embedded = false }: DialogflowEmbeddedChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // URL del Test Agent de Dialogflow CX
  const testAgentUrl = `https://dialogflow.cloud.google.com/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88/test`;
  
  if (embedded) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden border">
        <iframe
          src={testAgentUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Dialogflow CX Agent"
          className="bg-white"
          allow="microphone"
        />
      </div>
    );
  }
  
  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
      
      {/* Chat Window */}
      {isOpen && (
        <Card className={`fixed z-50 shadow-2xl transition-all ${
          isMaximized 
            ? 'inset-4' 
            : 'bottom-6 right-6 w-[400px] h-[600px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">AI Assistant - Gemini 2.5</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                aria-label={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Chat Content */}
          <div className="flex-1 h-[calc(100%-64px)]">
            <iframe
              src={testAgentUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Dialogflow CX Agent"
              className="bg-white rounded-b-lg"
              allow="microphone"
            />
          </div>
        </Card>
      )}
    </>
  );
}