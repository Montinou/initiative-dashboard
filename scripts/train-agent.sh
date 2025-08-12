#\!/bin/bash

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

echo "🚂 Entrenando el agente con los nuevos cambios..."

TOKEN=$(gcloud auth application-default print-access-token)
BASE_URL="https://$LOCATION-dialogflow.googleapis.com/v3"
AGENT_PATH="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

# Entrenar el agente
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
echo "📊 Resumen de cambios aplicados:"
echo "✅ Default Negative Intent: 20 frases en español agregadas"
echo "✅ Default Welcome Intent: 20 frases en español agregadas"
echo "✅ 6 intents en español creados anteriormente con 48 frases"
echo ""
echo "📈 Total: 88 training phrases en español agregadas al agente"
