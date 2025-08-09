#!/bin/bash

# Script para vincular Data Store a Dialogflow CX y configurar Generative Fallback

PROJECT_ID="insaight-backend"
PROJECT_NUMBER="30705406738"
LOCATION="global"
AGENT_ID="6e2f8db9-f5ca-435e-b2ed-80622f5a60f5"
DATA_STORE_ID="iniciativas-knowledge-base"

# Obtener token de acceso
ACCESS_TOKEN=$(gcloud auth print-access-token --project=${PROJECT_ID})

echo "Configurando el agente de Dialogflow CX con Data Store y Generative Fallback..."
echo "Project: ${PROJECT_ID}"
echo "Agent ID: ${AGENT_ID}"
echo "Data Store: ${DATA_STORE_ID}"
echo ""

# Primero, obtener la configuración actual del agente
echo "Obteniendo configuración actual del agente..."
AGENT_CONFIG=$(curl -s -X GET \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-user-project: ${PROJECT_ID}")

# Actualizar el agente con Advanced Settings para Generative AI
echo "Actualizando agente con configuración de Generative AI..."
curl -X PATCH \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=advancedSettings" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "advancedSettings": {
      "loggingSettings": {
        "enableStackdriverLogging": true
      },
      "speechSettings": {
        "endpointerSensitivity": 30,
        "noSpeechTimeout": "5s",
        "useTimeoutBasedEndpointing": true
      }
    },
    "genAppBuilderSettings": {
      "engine": "projects/'"${PROJECT_NUMBER}"'/locations/'"${LOCATION}"'/collections/default_collection/dataStores/'"${DATA_STORE_ID}"'/engines/'"${DATA_STORE_ID}"'"
    }
  }'

echo ""
echo ""

# Configurar el Generative Fallback en el Start Flow
echo "Configurando Generative Fallback en el flow principal..."
FLOW_ID="00000000-0000-0000-0000-000000000000"

# Actualizar el flow con Generative Fallback
curl -X PATCH \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/${FLOW_ID}?updateMask=eventHandlers" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "eventHandlers": [
      {
        "event": "sys.no-match-default",
        "triggerFulfillment": {
          "messages": [
            {
              "text": {
                "text": ["Lo siento, no entendí tu pregunta. Déjame buscar información relevante para ayudarte."]
              }
            }
          ],
          "enableGenerativeFallback": true
        }
      },
      {
        "event": "sys.no-input-default",
        "triggerFulfillment": {
          "messages": [
            {
              "text": {
                "text": ["¿Hay algo en lo que pueda ayudarte con la gestión de iniciativas?"]
              }
            }
          ]
        }
      }
    ]
  }'

echo ""
echo ""
echo "Configuración completada. El agente ahora está conectado al Data Store con Generative Fallback habilitado."