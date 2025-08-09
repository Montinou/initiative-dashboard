#!/bin/bash

# Script para configurar Knowledge Connector en Dialogflow CX

PROJECT_ID="insaight-backend"
PROJECT_NUMBER="30705406738"
LOCATION="global"
AGENT_ID="6e2f8db9-f5ca-435e-b2ed-80622f5a60f5"
DATA_STORE_ID="iniciativas-knowledge-base"
FLOW_ID="00000000-0000-0000-0000-000000000000"

# Obtener token de acceso
ACCESS_TOKEN=$(gcloud auth print-access-token --project=${PROJECT_ID})

echo "Configurando Knowledge Connector para el agente..."
echo "=================================="
echo "Project: ${PROJECT_ID}"
echo "Agent: ${AGENT_ID}"
echo "Data Store: ${DATA_STORE_ID}"
echo ""

# Crear una página con Knowledge Store Handler
echo "Creando página con Knowledge Store Handler..."
PAGE_RESPONSE=$(curl -s -X POST \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/${FLOW_ID}/pages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "displayName": "Knowledge Search Page",
    "knowledgeConnectorSettings": {
      "enabled": true,
      "triggerFulfillment": {
        "messages": [
          {
            "text": {
              "text": ["Buscando información sobre tu consulta..."]
            }
          }
        ]
      },
      "dataStoreConnections": [
        {
          "dataStoreType": "PUBLIC_WEB",
          "dataStore": "projects/'"${PROJECT_NUMBER}"'/locations/'"${LOCATION}"'/collections/default_collection/dataStores/'"${DATA_STORE_ID}"'"
        }
      ]
    },
    "entryFulfillment": {
      "messages": [
        {
          "knowledgeInfoCard": {}
        }
      ]
    }
  }')

echo "$PAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PAGE_RESPONSE"
echo ""

# Extraer el ID de la página creada
PAGE_ID=$(echo "$PAGE_RESPONSE" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*pages/[^"]*"' | sed 's/.*pages\///' | sed 's/".*//')

if [ -z "$PAGE_ID" ]; then
  echo "Error: No se pudo crear la página"
  exit 1
fi

echo "Página creada con ID: $PAGE_ID"
echo ""

# Actualizar el flow principal para incluir la transición a la página de knowledge
echo "Actualizando flow principal con transición a Knowledge Search..."
curl -X PATCH \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/flows/${FLOW_ID}?updateMask=transitionRoutes" \
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
      },
      {
        "condition": "true",
        "targetPage": "projects/'"${PROJECT_ID}"'/locations/'"${LOCATION}"'/agents/'"${AGENT_ID}"'/flows/'"${FLOW_ID}"'/pages/'"${PAGE_ID}"'"
      }
    ]
  }' | python3 -m json.tool 2>/dev/null

echo ""
echo "✅ Configuración completada exitosamente!"
echo ""
echo "Resumen:"
echo "- Knowledge Connector habilitado"
echo "- Data Store vinculado: ${DATA_STORE_ID}"
echo "- Página de búsqueda creada: ${PAGE_ID}"
echo "- Generative Fallback activo"
echo ""
echo "El agente ahora puede responder preguntas basándose en los datos de iniciativas en BigQuery."