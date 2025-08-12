#\!/bin/bash

# Script para agregar training phrases al Default Negative Intent

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

echo "🚀 Agregando training phrases al Default Negative Intent..."
echo "📍 Proyecto: $PROJECT_ID"
echo "📍 Ubicación: $LOCATION"
echo "📍 Agent ID: $AGENT_ID"
echo ""

# Obtener token
TOKEN=$(gcloud auth application-default print-access-token)
BASE_URL="https://$LOCATION-dialogflow.googleapis.com/v3"
AGENT_PATH="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

# Primero, obtener el ID del Default Negative Intent
echo "🔍 Buscando Default Negative Intent..."
INTENTS=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$AGENT_PATH/intents?languageCode=es")

# Buscar el ID del Default Negative Intent
INTENT_ID=$(echo "$INTENTS" | grep -B2 '"Default Negative Intent"' | grep '"name"' | sed 's/.*"intents\/\([^"]*\)".*/\1/' | head -1)

if [ -z "$INTENT_ID" ]; then
    echo "❌ No se encontró el Default Negative Intent"
    exit 1
fi

echo "✅ Intent encontrado con ID: $INTENT_ID"

# Obtener el intent actual
CURRENT_INTENT=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$AGENT_PATH/intents/$INTENT_ID?languageCode=es")

# Preparar las training phrases en español
cat > /tmp/update-intent.json << 'JSON'
{
  "name": "INTENT_PATH",
  "displayName": "Default Negative Intent",
  "trainingPhrases": [
    {"parts": [{"text": "no"}], "repeatCount": 1},
    {"parts": [{"text": "no gracias"}], "repeatCount": 1},
    {"parts": [{"text": "no quiero"}], "repeatCount": 1},
    {"parts": [{"text": "para nada"}], "repeatCount": 1},
    {"parts": [{"text": "de ninguna manera"}], "repeatCount": 1},
    {"parts": [{"text": "nunca"}], "repeatCount": 1},
    {"parts": [{"text": "jamás"}], "repeatCount": 1},
    {"parts": [{"text": "negativo"}], "repeatCount": 1},
    {"parts": [{"text": "no estoy interesado"}], "repeatCount": 1},
    {"parts": [{"text": "no me interesa"}], "repeatCount": 1},
    {"parts": [{"text": "mejor no"}], "repeatCount": 1},
    {"parts": [{"text": "déjalo"}], "repeatCount": 1},
    {"parts": [{"text": "olvídalo"}], "repeatCount": 1},
    {"parts": [{"text": "cancelar"}], "repeatCount": 1},
    {"parts": [{"text": "detener"}], "repeatCount": 1},
    {"parts": [{"text": "parar"}], "repeatCount": 1},
    {"parts": [{"text": "no quiero continuar"}], "repeatCount": 1},
    {"parts": [{"text": "no deseo"}], "repeatCount": 1},
    {"parts": [{"text": "rechazar"}], "repeatCount": 1},
    {"parts": [{"text": "denegar"}], "repeatCount": 1}
  ],
  "priority": 500000
}
JSON

# Reemplazar INTENT_PATH con la ruta real
sed -i.bak "s|INTENT_PATH|$AGENT_PATH/intents/$INTENT_ID|" /tmp/update-intent.json

echo "📝 Actualizando intent con training phrases en español..."

# Actualizar el intent
RESPONSE=$(curl -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -H "Content-Type: application/json" \
    -d @/tmp/update-intent.json \
    "$BASE_URL/$AGENT_PATH/intents/$INTENT_ID?languageCode=es&updateMask=trainingPhrases" \
    -s)

# Verificar respuesta
if echo "$RESPONSE" | grep -q "error"; then
    echo "⚠️ Error actualizando intent:"
    echo "$RESPONSE" | jq '.error.message' 2>/dev/null || echo "$RESPONSE"
else
    echo "✅ Intent actualizado exitosamente con 20 training phrases en español"
fi

echo ""
echo "🎯 Training phrases agregadas:"
echo "  • no"
echo "  • no gracias"
echo "  • no quiero"
echo "  • para nada"
echo "  • de ninguna manera"
echo "  • nunca / jamás"
echo "  • no estoy interesado"
echo "  • cancelar / detener / parar"
echo "  • ... y más variaciones"

echo ""
echo "💡 El Default Negative Intent ahora reconocerá negativas en español"
echo "🚂 Recuerda entrenar el agente en la consola para aplicar los cambios"

# Limpiar archivos temporales
rm -f /tmp/update-intent.json /tmp/update-intent.json.bak
