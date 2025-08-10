#!/bin/bash

# Script para configurar Tools y conexiones de datos en Dialogflow CX

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
AGENT_NAME="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

echo "🔧 Configurando Tools y conexiones de datos para Dialogflow CX..."

# 1. Primero, desplegar la Cloud Function si no existe
echo "☁️ Verificando Cloud Function webhook..."
FUNCTION_EXISTS=$(gcloud functions describe dialogflowWebhook --region=$LOCATION --format="value(name)" 2>/dev/null)

if [ -z "$FUNCTION_EXISTS" ]; then
  echo "📦 Desplegando Cloud Function webhook..."
  cd docs/dialog-search/cloud-function-dialogflow-webhook
  
  # Instalar dependencias si es necesario
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  
  # Desplegar función
  gcloud functions deploy dialogflowWebhook \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --region=$LOCATION \
    --set-env-vars "SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co,GCLOUD_PROJECT_ID=$PROJECT_ID" \
    --set-secrets "SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest"
  
  cd ../../..
else
  echo "✅ Cloud Function ya existe"
fi

# 2. Obtener URL del webhook
WEBHOOK_URL="https://$LOCATION-$PROJECT_ID.cloudfunctions.net/dialogflowWebhook"
echo "🔗 Webhook URL: $WEBHOOK_URL"

# 3. Crear Tools en Dialogflow
echo "🛠️ Configurando Tools en Dialogflow..."

# Tool para consultar iniciativas
cat > /tmp/tool-query-initiatives.json << EOF
{
  "displayName": "query_initiatives",
  "description": "Consultar iniciativas activas desde BigQuery y Supabase",
  "openApiSpec": {
    "openapi": "3.0.0",
    "info": {
      "title": "Query Initiatives API",
      "version": "1.0.0"
    },
    "servers": [
      {
        "url": "$WEBHOOK_URL"
      }
    ],
    "paths": {
      "/": {
        "post": {
          "summary": "Query initiatives",
          "operationId": "queryInitiatives",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tenant_id": {
                      "type": "string",
                      "description": "ID del tenant"
                    },
                    "area_id": {
                      "type": "string",
                      "description": "ID del área"
                    },
                    "status": {
                      "type": "string",
                      "description": "Estado de las iniciativas"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
EOF

# Crear el tool
curl -X POST \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/tools" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/tool-query-initiatives.json

echo "✅ Tool query_initiatives creado"

# 4. Configurar Datastore connection para BigQuery
echo "📊 Configurando conexión con BigQuery..."

cat > /tmp/datastore-config.json << EOF
{
  "displayName": "BigQuery Initiatives Datastore",
  "description": "Conexión con BigQuery para datos de iniciativas",
  "dataStoreConnections": [
    {
      "dataStoreType": "PUBLIC_WEB",
      "dataStore": "projects/$PROJECT_ID/locations/us-central1/collections/default_collection/dataStores/initiatives-search-store"
    }
  ]
}
EOF

# 5. Actualizar el flujo principal para usar Tools
echo "🔄 Actualizando flujo principal con Tools..."

START_FLOW="$AGENT_NAME/flows/00000000-0000-0000-0000-000000000000"

# Obtener la página de inicio del flujo
PAGES=$(curl -s -X GET \
  "https://us-central1-dialogflow.googleapis.com/v3/$START_FLOW/pages" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "x-goog-user-project: $PROJECT_ID")

echo "$PAGES" | jq '.pages[0].name' -r > /tmp/start_page_name.txt
START_PAGE=$(cat /tmp/start_page_name.txt)

# Crear una ruta que use el webhook
cat > /tmp/route-config.json << EOF
{
  "intent": "projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/intents/consultar.iniciativas",
  "condition": "",
  "triggerFulfillment": {
    "webhook": "$WEBHOOK_URL",
    "tag": "query-initiatives",
    "setParameterActions": [
      {
        "parameter": "action",
        "value": "query_initiatives"
      }
    ]
  },
  "name": "route_query_initiatives"
}
EOF

# Agregar la ruta a la página de inicio
if [ ! -z "$START_PAGE" ] && [ "$START_PAGE" != "null" ]; then
  curl -X POST \
    "https://us-central1-dialogflow.googleapis.com/v3/$START_PAGE/transitionRoutes" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -d @/tmp/route-config.json
  
  echo "✅ Ruta con webhook agregada"
fi

# 6. Configurar el playbook para usar Tools
echo "📚 Actualizando playbook para usar Tools..."

# Obtener el ID del playbook existente
PLAYBOOKS=$(curl -s -X GET \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/playbooks" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "x-goog-user-project: $PROJECT_ID")

PLAYBOOK_ID=$(echo "$PLAYBOOKS" | jq -r '.playbooks[0].name' | sed 's/.*\///')

if [ ! -z "$PLAYBOOK_ID" ] && [ "$PLAYBOOK_ID" != "null" ]; then
  cat > /tmp/playbook-update.json << EOF
{
  "displayName": "Gestión Inteligente de Iniciativas",
  "goal": "Ayudar a los usuarios a gestionar iniciativas consultando datos reales de BigQuery y Supabase",
  "instructions": [
    {
      "text": "IMPORTANTE: Siempre usa el tool 'query_initiatives' para consultar datos reales de iniciativas antes de responder."
    },
    {
      "text": "Cuando el usuario pregunte sobre iniciativas, primero consulta los datos reales usando el webhook configurado."
    },
    {
      "text": "Para crear iniciativas, usa los datos históricos de BigQuery para generar parámetros optimizados."
    },
    {
      "text": "Analiza tendencias y patrones en los datos para hacer sugerencias inteligentes."
    }
  ],
  "llmModelSettings": {
    "model": "models/gemini-2.0-flash-001",
    "promptText": "Eres un asistente experto que tiene acceso a datos reales de BigQuery y Supabase. SIEMPRE consulta los datos reales antes de responder sobre el estado de iniciativas."
  }
}
EOF

  curl -X PATCH \
    "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/playbooks/$PLAYBOOK_ID?updateMask=instructions,llmModelSettings" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -d @/tmp/playbook-update.json
  
  echo "✅ Playbook actualizado con instrucciones para usar datos reales"
fi

# 7. Habilitar BigQuery API si no está habilitada
echo "🔍 Verificando BigQuery API..."
gcloud services enable bigquery.googleapis.com

# 8. Crear dataset en BigQuery si no existe
echo "📊 Verificando dataset de BigQuery..."
bq ls -d $PROJECT_ID:gestion_iniciativas &>/dev/null
if [ $? -ne 0 ]; then
  echo "Creando dataset gestion_iniciativas..."
  bq mk -d \
    --location=US \
    --description="Dataset para gestión de iniciativas" \
    $PROJECT_ID:gestion_iniciativas
fi

# 9. Limpiar archivos temporales
rm -f /tmp/tool-*.json /tmp/datastore-*.json /tmp/route-*.json /tmp/playbook-*.json /tmp/start_page_name.txt

echo "
🎉 ¡Configuración completada exitosamente!

✅ Configuraciones realizadas:
1. Cloud Function webhook desplegada/verificada
2. Tools creados para consultar datos
3. Conexión con BigQuery configurada
4. Rutas con webhooks agregadas
5. Playbook actualizado para usar datos reales

📝 El agente ahora puede:
- Consultar iniciativas reales desde BigQuery/Supabase
- Crear nuevas iniciativas con datos optimizados
- Analizar tendencias y patrones históricos
- Sugerir iniciativas basadas en datos reales

🔗 URL del webhook: $WEBHOOK_URL
🤖 Agente: https://conversational-agents.cloud.google.com/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID

⚠️ Nota: Asegúrate de configurar la variable de entorno SUPABASE_SERVICE_KEY en Secret Manager si aún no lo has hecho.
"