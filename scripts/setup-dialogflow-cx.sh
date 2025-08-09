#!/bin/bash

# Configuración de Dialogflow CX con Generative AI
set -e

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_NAME="initiative-assistant-generative"
DISPLAY_NAME="Initiative Assistant with Gemini"
LANGUAGE="es"
TIME_ZONE="America/Buenos_Aires"

echo "=========================================="
echo "🤖 Configurando Dialogflow CX Generativo"
echo "=========================================="
echo ""

# 1. Habilitar APIs necesarias
echo "1. Habilitando APIs necesarias..."
gcloud services enable dialogflow.googleapis.com \
  discoveryengine.googleapis.com \
  aiplatform.googleapis.com \
  --project=$PROJECT_ID

# 2. Crear el agente usando la API REST
echo ""
echo "2. Creando agente Dialogflow CX..."

# Crear el JSON del agente
cat > /tmp/agent.json <<EOF
{
  "displayName": "$DISPLAY_NAME",
  "defaultLanguageCode": "$LANGUAGE",
  "timeZone": "$TIME_ZONE",
  "description": "Asistente inteligente para gestión de iniciativas con predicciones ML de BigQuery",
  "enableStackdriverLogging": true,
  "enableSpellCorrection": true,
  "advancedSettings": {
    "loggingSettings": {
      "enableStackdriverLogging": true,
      "enableInteractionLogging": true
    }
  },
  "genAppBuilderSettings": {
    "engine": "projects/$PROJECT_ID/locations/$LOCATION/collections/default_collection/engines/initiatives-search-store"
  }
}
EOF

# Crear el agente usando curl con la API REST
ACCESS_TOKEN=$(gcloud auth print-access-token)

RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/agent.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents" \
  2>/dev/null)

# Extraer el ID del agente
AGENT_ID=$(echo $RESPONSE | grep -o '"name":"[^"]*' | sed 's/"name":"projects\/[^\/]*\/locations\/[^\/]*\/agents\///')

if [ -z "$AGENT_ID" ]; then
  echo "❌ Error creando el agente. Respuesta:"
  echo $RESPONSE
  
  # Intentar obtener agente existente
  echo ""
  echo "Buscando agente existente..."
  
  EXISTING_AGENTS=$(curl -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents" \
    2>/dev/null)
  
  AGENT_ID=$(echo $EXISTING_AGENTS | grep -o '"name":"projects/[^"]*' | head -1 | sed 's/.*agents\///')
  
  if [ ! -z "$AGENT_ID" ]; then
    echo "✅ Agente existente encontrado: $AGENT_ID"
  fi
else
  echo "✅ Agente creado con ID: $AGENT_ID"
fi

if [ -z "$AGENT_ID" ]; then
  echo "No se pudo crear ni encontrar un agente."
  exit 1
fi

# 3. Configurar el Generative Playbook
echo ""
echo "3. Configurando Generative Playbook..."

# Crear el playbook
cat > /tmp/playbook.json <<EOF
{
  "displayName": "Initiative Management Playbook",
  "goal": "Ayudar a gestionar iniciativas inteligentemente usando datos de BigQuery y predicciones ML",
  "instructions": [
    {
      "text": "Cuando el usuario pregunte sobre iniciativas, consulta los datos en BigQuery a través del Knowledge Store"
    },
    {
      "text": "Para crear nuevas iniciativas, usa las predicciones ML de la vista smart_initiative_suggestions"
    },
    {
      "text": "Analiza el histórico de iniciativas exitosas para hacer recomendaciones"
    },
    {
      "text": "Considera la carga actual del equipo antes de sugerir nuevas iniciativas"
    }
  ],
  "llmModelSettings": {
    "model": "gemini-1.5-pro",
    "promptText": "Eres un asistente experto en gestión de proyectos OKR. Tienes acceso a datos históricos de iniciativas y predicciones ML. Ayuda al usuario a tomar decisiones basadas en datos."
  }
}
EOF

# Crear el playbook
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/playbook.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/playbooks" \
  2>/dev/null > /tmp/playbook_response.json

echo "✅ Playbook configurado"

# 4. Conectar con el Data Store de Vertex AI
echo ""
echo "4. Conectando con Vertex AI Search Data Store..."

# Configurar el Data Store connection
cat > /tmp/datastore_connection.json <<EOF
{
  "dataStoreConnections": [
    {
      "dataStoreType": "PUBLIC_WEB",
      "dataStore": "projects/$PROJECT_ID/locations/global/collections/default_collection/dataStores/initiatives-search-store_1736179520179"
    }
  ]
}
EOF

# Actualizar el agente con la conexión al Data Store
curl -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/datastore_connection.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=dataStoreConnections" \
  2>/dev/null > /tmp/datastore_response.json

echo "✅ Data Store conectado"

# 5. Habilitar Generative Fallback
echo ""
echo "5. Habilitando Generative Fallback..."

# Configurar el flow principal con Generative Fallback
cat > /tmp/generative_settings.json <<EOF
{
  "generativeSettings": {
    "fallbackSettings": {
      "selectedFallback": "GENERATIVE_FALLBACK",
      "generativeSafetySettings": {
        "bannedPhrases": []
      },
      "knowledgeConnectorSettings": {
        "enabled": true,
        "dataStores": [
          "projects/$PROJECT_ID/locations/global/collections/default_collection/dataStores/initiatives-search-store_1736179520179"
        ]
      }
    },
    "llmModelSettings": {
      "model": "gemini-1.5-pro"
    }
  }
}
EOF

# Aplicar configuración generativa
curl -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/generative_settings.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/00000000-0000-0000-0000-000000000000?updateMask=generativeSettings" \
  2>/dev/null > /tmp/generative_response.json

echo "✅ Generative Fallback habilitado"

# 6. Guardar configuración
echo ""
echo "6. Guardando configuración..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/docs/dialog-search/agent-config.json <<EOF
{
  "projectId": "$PROJECT_ID",
  "location": "$LOCATION",
  "agentId": "$AGENT_ID",
  "agentName": "projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID",
  "displayName": "$DISPLAY_NAME",
  "language": "$LANGUAGE",
  "dataStore": "initiatives-search-store_1736179520179",
  "llmModel": "gemini-1.5-pro",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "✅ Configuración guardada en docs/dialog-search/agent-config.json"

# 7. Generar código del widget
echo ""
echo "7. Generando código del widget..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/components/dialogflow-widget.tsx <<'EOF'
'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export function DialogflowWidget() {
  useEffect(() => {
    // Configurar el widget cuando el script se cargue
    if (typeof window !== 'undefined' && (window as any).dfMessenger) {
      const dfMessenger = document.querySelector('df-messenger');
      if (dfMessenger) {
        dfMessenger.setAttribute('intent', 'WELCOME');
        dfMessenger.setAttribute('chat-title', 'Asistente de Iniciativas');
      }
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
        agent-id="AGENT_ID_PLACEHOLDER"
        language-code="es"
        max-query-length="256"
      >
        <df-messenger-chat-bubble
          chat-title="Asistente IA"
          chat-subtitle="Pregúntame sobre iniciativas"
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
        }
      `}</style>
    </>
  );
}
EOF

# Reemplazar el placeholder con el Agent ID real
sed -i '' "s/AGENT_ID_PLACEHOLDER/$AGENT_ID/" /Users/agustinmontoya/Projectos/initiative-dashboard/components/dialogflow-widget.tsx

echo "✅ Widget component creado en components/dialogflow-widget.tsx"

# 8. Mostrar resumen
echo ""
echo "=========================================="
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Agent ID: $AGENT_ID"
echo "Location: $LOCATION"
echo "Project: $PROJECT_ID"
echo ""
echo "Próximos pasos:"
echo "1. Importar el widget en tu layout principal:"
echo "   import { DialogflowWidget } from '@/components/dialogflow-widget'"
echo ""
echo "2. Añadir el widget al layout:"
echo "   <DialogflowWidget />"
echo ""
echo "3. Probar el agente en:"
echo "   https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/intents"
echo ""

# Limpiar archivos temporales
rm -f /tmp/agent.json /tmp/playbook.json /tmp/datastore_connection.json /tmp/generative_settings.json
rm -f /tmp/*_response.json

echo "✅ Script completado exitosamente"