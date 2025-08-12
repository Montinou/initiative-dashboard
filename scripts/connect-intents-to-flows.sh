#!/bin/bash

# Script para conectar los intents con los flows y entrenar el agente

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

echo "🔗 Conectando intents con flows en Dialogflow CX..."
echo "📍 Proyecto: $PROJECT_ID"
echo "📍 Ubicación: $LOCATION"
echo "📍 Agent ID: $AGENT_ID"
echo ""

# Obtener token
TOKEN=$(gcloud auth application-default print-access-token)
BASE_URL="https://$LOCATION-dialogflow.googleapis.com/v3"
AGENT_PATH="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

# 1. Primero obtener el flow principal
echo "📋 Obteniendo flows existentes..."
FLOWS=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$AGENT_PATH/flows")

# Extraer el flow principal (Default Start Flow)
DEFAULT_FLOW=$(echo "$FLOWS" | grep -o '"name":"[^"]*flows/00000000-0000-0000-0000-000000000000"' | cut -d'"' -f4 | head -1)

if [ -z "$DEFAULT_FLOW" ]; then
    echo "⚠️ No se encontró el Default Start Flow"
    # Usar el primer flow encontrado
    DEFAULT_FLOW=$(echo "$FLOWS" | grep -o '"name":"[^"]*flows/[^"]*"' | cut -d'"' -f4 | head -1)
fi

echo "✅ Flow encontrado: $DEFAULT_FLOW"
echo ""

# 2. Obtener las páginas del flow
echo "📄 Obteniendo páginas del flow..."
PAGES=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$DEFAULT_FLOW/pages")

# Extraer la página START
START_PAGE=$(echo "$PAGES" | grep -o '"name":"[^"]*pages/START"' | cut -d'"' -f4 | head -1)

if [ -z "$START_PAGE" ]; then
    echo "⚠️ No se encontró la página START, usando la primera página"
    START_PAGE=$(echo "$PAGES" | grep -o '"name":"[^"]*pages/[^"]*"' | cut -d'"' -f4 | head -1)
fi

echo "✅ Página encontrada: $START_PAGE"
echo ""

# 3. Obtener los intents creados
echo "🎯 Obteniendo intents..."
INTENTS=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$AGENT_PATH/intents?languageCode=es")

# Lista de intents que creamos
INTENT_NAMES=(
    "query_initiatives_spanish"
    "query_objectives_spanish"
    "query_activities_spanish"
    "create_objective_spanish"
    "create_activity_spanish"
    "assign_activity_spanish"
)

# 4. Para cada intent, crear un route en la página
for INTENT_NAME in "${INTENT_NAMES[@]}"; do
    echo "🔗 Procesando intent: $INTENT_NAME"
    
    # Buscar el ID del intent
    INTENT_ID=$(echo "$INTENTS" | grep -o "\"name\":\"[^\"]*intents/[^\"]*\",\"displayName\":\"$INTENT_NAME\"" | grep -o 'intents/[a-f0-9-]*' | head -1)
    
    if [ -z "$INTENT_ID" ]; then
        echo "  ⚠️ No se encontró el intent $INTENT_NAME"
        continue
    fi
    
    echo "  ✅ Intent ID: $INTENT_ID"
    
    # Crear un transition route para este intent
    # Esto conecta el intent con el webhook
    ROUTE_JSON=$(cat <<EOF
{
  "intent": "$AGENT_PATH/$INTENT_ID",
  "condition": "",
  "triggerFulfillment": {
    "webhook": "projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/webhooks/dialogflow-webhook",
    "messages": [
      {
        "text": {
          "text": ["Procesando tu solicitud..."]
        }
      }
    ]
  }
}
EOF
)
    
    echo "  📝 Creando route para webhook..."
    
    # Nota: En Dialogflow CX, los routes se configuran mejor desde la consola
    # porque requieren actualizar la página completa con PATCH
    echo "  ℹ️ Route preparado para configuración manual"
done

echo ""
echo "🚂 Entrenando el agente..."

# 5. Entrenar el agente
TRAIN_RESPONSE=$(curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -H "Content-Type: application/json" \
    "$BASE_URL/$AGENT_PATH:train" \
    -s)

if echo "$TRAIN_RESPONSE" | grep -q "error"; then
    echo "⚠️ Error al entrenar:"
    echo "$TRAIN_RESPONSE" | jq '.error.message' 2>/dev/null || echo "$TRAIN_RESPONSE"
else
    echo "✅ Entrenamiento iniciado exitosamente"
    echo "   El entrenamiento puede tomar unos minutos..."
fi

echo ""
echo "📋 Resumen de intents creados:"
echo "--------------------------------"
for INTENT_NAME in "${INTENT_NAMES[@]}"; do
    INTENT_EXISTS=$(echo "$INTENTS" | grep -c "\"$INTENT_NAME\"")
    if [ "$INTENT_EXISTS" -gt 0 ]; then
        echo "✅ $INTENT_NAME"
    else
        echo "❌ $INTENT_NAME (no encontrado)"
    fi
done

echo ""
echo "🎯 Próximos pasos:"
echo "1. Ve a https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"
echo "2. En el flujo principal, conecta cada intent con el webhook"
echo "3. Configura las respuestas del webhook para usar las funciones correctas"
echo "4. Prueba en el simulador con frases como:"
echo "   - 'muéstrame las iniciativas'"
echo "   - 'ver objetivos'"
echo "   - 'crear una actividad'"
echo ""
echo "💡 Tip: El webhook ya está configurado en:"
echo "   https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook"