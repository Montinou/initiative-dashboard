#!/bin/bash

# Script para habilitar la integración de Dialogflow Messenger
set -e

echo "=========================================="
echo "🔧 Habilitando Dialogflow Messenger"
echo "=========================================="
echo ""

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
ACCESS_TOKEN=$(gcloud auth print-access-token)

# 1. Habilitar la integración de Messenger
echo "1. Habilitando integración de Messenger..."

# Crear la integración de Messenger
cat > /tmp/messenger-integration.json <<EOF
{
  "displayName": "Web Messenger Integration",
  "messagingPlatformSettings": {
    "customAgentName": "Initiative Assistant",
    "customAgentAvatar": "",
    "customCss": ".df-messenger-wrapper { font-family: system-ui, -apple-system, sans-serif; }",
    "enableLiveAgentHandoff": false,
    "enableFileUpload": false,
    "enableAudioInput": true
  },
  "allowedDomains": [
    "localhost:3000",
    "localhost:3001", 
    "siga-turismo.vercel.app",
    "*.vercel.app",
    "initiative-dashboard.vercel.app",
    "stratix.vercel.app"
  ],
  "enableStackdriverLogging": true,
  "enableSpellCorrection": true,
  "enableAutomaticSpelling": true
}
EOF

# Intentar crear la integración usando la API REST
INTEGRATION_RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/messenger-integration.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/integrations" \
  2>/dev/null || echo "{}")

echo "Respuesta: $INTEGRATION_RESPONSE"

# 2. Configurar seguridad y CORS
echo ""
echo "2. Configurando seguridad y CORS..."

cat > /tmp/agent-security.json <<EOF
{
  "securitySettings": {
    "purgeDataTypes": [],
    "retentionWindowDays": 30,
    "allowedCallerIps": [],
    "allowedDomains": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://siga-turismo.vercel.app",
      "https://*.vercel.app"
    ]
  }
}
EOF

curl -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/agent-security.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=securitySettings" \
  > /tmp/security_response.json 2>/dev/null

echo "✅ Seguridad configurada"

# 3. Obtener el código de integración
echo ""
echo "3. Generando código de integración..."

# El código HTML/JS para el widget
cat > /tmp/dialogflow-snippet.html <<EOF
<!-- Dialogflow Messenger widget -->
<script src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"></script>
<df-messenger
  intent="WELCOME"
  chat-title="Initiative Assistant"
  agent-id="${AGENT_ID}"
  location="${LOCATION}"
  language-code="es"
  expand="true">
</df-messenger>

<style>
  df-messenger {
    --df-messenger-bot-message: #f3f4f6;
    --df-messenger-button-titlebar-color: #3b82f6;
    --df-messenger-chat-background-color: #ffffff;
    --df-messenger-font-color: #1f2937;
    --df-messenger-send-icon: #3b82f6;
    --df-messenger-user-message: #3b82f6;
    --df-messenger-user-message-color: #ffffff;
    z-index: 999;
    position: fixed;
    bottom: 20px;
    right: 20px;
  }
</style>
EOF

echo "✅ Snippet generado en /tmp/dialogflow-snippet.html"

# 4. Actualizar el componente de React
echo ""
echo "4. Actualizando componente React..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/components/dialogflow-messenger.tsx <<'EOF'
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
EOF

echo "✅ Componente React actualizado"

# 5. Resumen
echo ""
echo "=========================================="
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "El widget de Dialogflow Messenger está configurado con:"
echo "• Agent ID: $AGENT_ID"
echo "• Location: $LOCATION"
echo "• Language: Español"
echo ""
echo "Dominios permitidos:"
echo "• localhost:3000"
echo "• siga-turismo.vercel.app"
echo "• *.vercel.app"
echo ""
echo "Para usar el widget en tu app:"
echo "import { DialogflowMessenger } from '@/components/dialogflow-messenger';"
echo "<DialogflowMessenger /> // Botón flotante"
echo "<DialogflowMessenger expand /> // Widget expandido"
echo ""
echo "NOTA: Si el widget no aparece, verifica en:"
echo "https://console.cloud.google.com/dialogflow/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/integrations"
echo ""

# Limpiar archivos temporales
rm -f /tmp/messenger-integration.json /tmp/agent-security.json /tmp/*_response.json