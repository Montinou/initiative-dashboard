#!/bin/bash

# Script para corregir el flujo del agente y configurar correctamente el Knowledge Store

PROJECT_ID="insaight-backend"
PROJECT_NUMBER="30705406738"
LOCATION="global"
AGENT_ID="6e2f8db9-f5ca-435e-b2ed-80622f5a60f5"
DATA_STORE_ID="iniciativas-knowledge-base"
FLOW_ID="00000000-0000-0000-0000-000000000000"

# Obtener token de acceso
ACCESS_TOKEN=$(gcloud auth print-access-token --project=${PROJECT_ID})

echo "Corrigiendo configuración del agente..."
echo "======================================="
echo ""

# Primero, actualizar el agente para habilitar el modo de búsqueda generativa
echo "1. Habilitando búsqueda generativa en el agente..."
curl -X PATCH \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=answerFeedbackSettings,genAppBuilderSettings" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "answerFeedbackSettings": {
      "enableAnswerFeedback": true
    },
    "genAppBuilderSettings": {
      "engine": "projects/'"${PROJECT_NUMBER}"'/locations/'"${LOCATION}"'/collections/default_collection/dataStores/'"${DATA_STORE_ID}"'/engines/'"${DATA_STORE_ID}"'"
    }
  }' | python3 -m json.tool 2>/dev/null | head -20

echo ""
echo "2. Actualizando el flow principal para usar Knowledge Store por defecto..."

# Actualizar el flow para que use el Knowledge Store en todas las consultas
curl -X PATCH \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/${FLOW_ID}?updateMask=transitionRoutes,eventHandlers" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "transitionRoutes": [
      {
        "intent": "projects/'"${PROJECT_ID}"'/locations/'"${LOCATION}"'/agents/'"${AGENT_ID}"'/intents/00000000-0000-0000-0000-000000000000",
        "triggerFulfillment": {
          "messages": [
            {
              "text": {
                "text": ["¡Hola! Soy tu asistente para la gestión de iniciativas. ¿En qué puedo ayudarte?"]
              }
            }
          ]
        }
      }
    ],
    "eventHandlers": [
      {
        "event": "sys.no-match-default",
        "triggerFulfillment": {
          "messages": [
            {
              "text": {
                "text": ["Déjame buscar esa información para ti..."]
              }
            },
            {
              "knowledgeInfoCard": {}
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
  }' | python3 -m json.tool 2>/dev/null | head -20

echo ""
echo "3. Verificando el estado del Data Store..."
curl -s -X GET \
  "https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_NUMBER}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-user-project: ${PROJECT_ID}" | python3 -c "
import sys
import json
data = json.load(sys.stdin)
print(f\"Data Store: {data.get('displayName', 'Unknown')}\")"

echo ""
echo "4. Verificando documentos indexados..."
curl -s -X GET \
  "https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_NUMBER}/locations/${LOCATION}/collections/default_collection/dataStores/${DATA_STORE_ID}/branches/default_branch/documents" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-user-project: ${PROJECT_ID}" | python3 -c "
import sys
import json
try:
    data = json.load(sys.stdin)
    docs = data.get('documents', [])
    print(f\"Documentos indexados: {len(docs)}\")
except:
    print(\"Documentos aún indexándose...\")"

echo ""
echo "✅ Configuración actualizada"
echo ""
echo "IMPORTANTE: El agente ahora debería:"
echo "1. Responder al saludo con el mensaje de bienvenida"
echo "2. Para cualquier otra pregunta, buscar en el Knowledge Store"
echo "3. Si no encuentra una respuesta específica, usar Generative Fallback"
echo ""
echo "Nota: La indexación de documentos puede tomar unos minutos."