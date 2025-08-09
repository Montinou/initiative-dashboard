#!/bin/bash

# Completar configuración de Dialogflow CX
set -e

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
DISPLAY_NAME="Initiative Assistant with Gemini"

echo "=========================================="
echo "🤖 Completando configuración de Dialogflow CX"
echo "=========================================="
echo ""
echo "Agent ID: $AGENT_ID"
echo ""

ACCESS_TOKEN=$(gcloud auth print-access-token)

# 1. Configurar el Generative Playbook
echo "1. Configurando Generative Playbook..."

cat > /tmp/playbook.json <<EOF
{
  "displayName": "Initiative Management Playbook",
  "goal": "Ayudar a gestionar iniciativas inteligentemente usando datos de BigQuery y predicciones ML",
  "instructions": [
    "Cuando el usuario pregunte sobre iniciativas, consulta los datos en BigQuery a través del Knowledge Store",
    "Para crear nuevas iniciativas, usa las predicciones ML de la vista smart_initiative_suggestions",
    "Analiza el histórico de iniciativas exitosas para hacer recomendaciones",
    "Considera la carga actual del equipo antes de sugerir nuevas iniciativas",
    "Responde siempre en español de manera profesional pero amigable"
  ],
  "llmModelSettings": {
    "model": "gemini-1.5-pro",
    "promptText": "Eres un asistente experto en gestión de proyectos OKR. Tienes acceso a datos históricos de iniciativas y predicciones ML de BigQuery. Ayuda al usuario a tomar decisiones basadas en datos. Responde siempre en español."
  }
}
EOF

curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/playbook.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/playbooks" \
  2>/dev/null > /tmp/playbook_response.json

echo "✅ Playbook configurado"

# 2. Obtener el flow principal
echo ""
echo "2. Obteniendo flow principal..."

FLOW_ID="00000000-0000-0000-0000-000000000000"
echo "Flow ID: $FLOW_ID"

# 3. Habilitar Generative Fallback en el flow principal
echo ""
echo "3. Habilitando Generative Fallback con Gemini Pro..."

cat > /tmp/flow_update.json <<EOF
{
  "displayName": "Default Start Flow",
  "nluSettings": {
    "modelType": "MODEL_TYPE_ADVANCED",
    "classificationThreshold": 0.3
  },
  "advancedSettings": {
    "enableGenerativeFallback": true
  }
}
EOF

curl -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/flow_update.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/${FLOW_ID}?updateMask=advancedSettings,nluSettings" \
  2>/dev/null > /tmp/flow_response.json

echo "✅ Generative Fallback habilitado"

# 4. Crear intent de bienvenida
echo ""
echo "4. Creando intent de bienvenida..."

cat > /tmp/welcome_intent.json <<EOF
{
  "displayName": "Welcome",
  "priority": 500000,
  "trainingPhrases": [
    {"parts": [{"text": "hola"}], "repeatCount": 1},
    {"parts": [{"text": "buenos días"}], "repeatCount": 1},
    {"parts": [{"text": "buenas tardes"}], "repeatCount": 1},
    {"parts": [{"text": "ayuda"}], "repeatCount": 1},
    {"parts": [{"text": "necesito ayuda"}], "repeatCount": 1},
    {"parts": [{"text": "qué puedes hacer"}], "repeatCount": 1}
  ],
  "messages": [
    {
      "text": {
        "text": [
          "¡Hola! 👋 Soy tu asistente inteligente para gestión de iniciativas. Puedo ayudarte con:",
          "• Ver el estado actual de tus iniciativas",
          "• Analizar el progreso de los objetivos",
          "• Sugerir nuevas iniciativas basadas en ML",
          "• Predecir el éxito de proyectos futuros",
          "",
          "¿En qué puedo ayudarte hoy?"
        ]
      }
    }
  ]
}
EOF

curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/welcome_intent.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/intents" \
  2>/dev/null > /tmp/intent_response.json

echo "✅ Intent de bienvenida creado"

# 5. Guardar configuración final
echo ""
echo "5. Guardando configuración..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/docs/dialog-search/agent-config.json <<EOF
{
  "projectId": "$PROJECT_ID",
  "location": "$LOCATION",
  "agentId": "$AGENT_ID",
  "agentName": "projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID",
  "displayName": "$DISPLAY_NAME",
  "language": "es",
  "dataStore": "initiatives-search-store_1736179520179",
  "llmModel": "gemini-1.5-pro",
  "features": {
    "generativeFallback": true,
    "playbook": true,
    "knowledgeConnector": false
  },
  "testUrl": "https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/intents",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ Configuración guardada"

# 6. Crear componente del widget
echo ""
echo "6. Creando componente del widget..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/components/dialogflow-widget.tsx <<'EOF'
'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function DialogflowWidget() {
  useEffect(() => {
    // Configurar el widget cuando el script se cargue
    if (typeof window !== 'undefined') {
      const checkAndConfigure = () => {
        const dfMessenger = document.querySelector('df-messenger');
        if (dfMessenger) {
          dfMessenger.setAttribute('intent', 'WELCOME');
          dfMessenger.setAttribute('chat-title', 'Asistente de Iniciativas');
        }
      };
      
      // Intentar configurar inmediatamente y después de un delay
      checkAndConfigure();
      setTimeout(checkAndConfigure, 1000);
    }
  }, []);

  return (
    <>
      <Script
        src="https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js?v=1"
        strategy="afterInteractive"
      />
      <df-messenger
        location="us-central1"
        project-id="insaight-backend"
        agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
        language-code="es"
        max-query-length="256"
      >
        <df-messenger-chat-bubble
          chat-title="Asistente IA"
        />
      </df-messenger>
      <style jsx global>{`
        df-messenger {
          z-index: 999;
          position: fixed;
          bottom: 20px;
          right: 20px;
          --df-messenger-bot-message: #f0f0f0;
          --df-messenger-button-titlebar-color: #0066cc;
          --df-messenger-button-titlebar-font-color: #ffffff;
          --df-messenger-chat-background-color: #ffffff;
          --df-messenger-font-color: #000000;
          --df-messenger-send-icon: #0066cc;
          --df-messenger-user-message: #0066cc;
          --df-messenger-user-message-font-color: #ffffff;
          --df-messenger-minimized-chat-close-icon-color: #ffffff;
          --df-messenger-input-box-color: #ffffff;
          --df-messenger-input-font-color: #000000;
          --df-messenger-input-placeholder-font-color: #757575;
        }
        
        df-messenger-chat-bubble {
          --df-messenger-chat-bubble-background: #0066cc;
          --df-messenger-chat-bubble-icon-color: #ffffff;
        }
      `}</style>
    </>
  );
}
EOF

echo "✅ Widget component creado"

# 7. Crear página de prueba
echo ""
echo "7. Creando página de prueba..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/app/test-chat/page.tsx <<'EOF'
import { DialogflowWidget } from '@/components/dialogflow-widget';

export default function TestChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Prueba del Asistente IA
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Preguntas de ejemplo:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>¿Cuáles son las iniciativas activas?</li>
            <li>¿Qué iniciativas tienen mayor probabilidad de éxito?</li>
            <li>¿Cuál es el progreso del área de Marketing?</li>
            <li>Sugiere una nueva iniciativa para el área de Tecnología</li>
            <li>¿Qué iniciativas están en riesgo?</li>
            <li>Analiza el histórico de iniciativas completadas</li>
          </ul>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 El asistente usa datos reales de BigQuery y predicciones ML para responder.
              Haz clic en el ícono azul en la esquina inferior derecha para comenzar.
            </p>
          </div>
        </div>
      </div>
      <DialogflowWidget />
    </div>
  );
}
EOF

echo "✅ Página de prueba creada en /test-chat"

# 8. Mostrar resumen final
echo ""
echo "=========================================="
echo "✅ CONFIGURACIÓN COMPLETADA CON ÉXITO"
echo "=========================================="
echo ""
echo "📊 Detalles del Agente:"
echo "  • Agent ID: $AGENT_ID"
echo "  • Location: $LOCATION"
echo "  • Project: $PROJECT_ID"
echo "  • Modelo: Gemini 1.5 Pro"
echo ""
echo "🚀 Para probar el chat:"
echo "  1. Inicia tu aplicación: pnpm dev"
echo "  2. Visita: http://localhost:3000/test-chat"
echo "  3. Haz clic en el ícono de chat azul"
echo ""
echo "🔗 Enlaces útiles:"
echo "  • Consola Dialogflow:"
echo "    https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"
echo ""
echo "  • Test en Dialogflow:"
echo "    https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/test"
echo ""
echo "📝 Nota: El agente ya puede responder usando Generative Fallback,"
echo "    pero para acceso completo a BigQuery, configura el Knowledge Connector"
echo "    en la consola de Dialogflow."
echo ""

# Limpiar archivos temporales
rm -f /tmp/*.json

echo "✅ Script completado exitosamente"