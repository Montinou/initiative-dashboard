#\!/bin/bash

# Script para agregar más training phrases en español al Default Welcome Intent

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

echo "🚀 Agregando training phrases en español al Default Welcome Intent..."
echo "📍 Proyecto: $PROJECT_ID"
echo "📍 Ubicación: $LOCATION"
echo "📍 Agent ID: $AGENT_ID"
echo ""

# Obtener token
TOKEN=$(gcloud auth application-default print-access-token)
BASE_URL="https://$LOCATION-dialogflow.googleapis.com/v3"
AGENT_PATH="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

# Primero, obtener el ID del Default Welcome Intent
echo "🔍 Buscando Default Welcome Intent..."
INTENTS=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    "$BASE_URL/$AGENT_PATH/intents?languageCode=es")

# Buscar el ID del Default Welcome Intent
INTENT_ID=$(echo "$INTENTS" | grep -B2 '"Default Welcome Intent"' | grep '"name"' | sed 's/.*"intents\/\([^"]*\)".*/\1/' | head -1)

if [ -z "$INTENT_ID" ]; then
    echo "❌ No se encontró el Default Welcome Intent"
    exit 1
fi

echo "✅ Intent encontrado con ID: $INTENT_ID"

# Preparar las training phrases en español (agregando a las existentes)
cat > /tmp/update-welcome.json << 'JSON'
{
  "name": "INTENT_PATH",
  "displayName": "Default Welcome Intent",
  "trainingPhrases": [
    {"parts": [{"text": "hola"}], "repeatCount": 1},
    {"parts": [{"text": "buenos días"}], "repeatCount": 1},
    {"parts": [{"text": "buenas tardes"}], "repeatCount": 1},
    {"parts": [{"text": "buenas noches"}], "repeatCount": 1},
    {"parts": [{"text": "hey"}], "repeatCount": 1},
    {"parts": [{"text": "qué tal"}], "repeatCount": 1},
    {"parts": [{"text": "cómo estás"}], "repeatCount": 1},
    {"parts": [{"text": "saludos"}], "repeatCount": 1},
    {"parts": [{"text": "buen día"}], "repeatCount": 1},
    {"parts": [{"text": "necesito ayuda"}], "repeatCount": 1},
    {"parts": [{"text": "puedes ayudarme"}], "repeatCount": 1},
    {"parts": [{"text": "empezar"}], "repeatCount": 1},
    {"parts": [{"text": "comenzar"}], "repeatCount": 1},
    {"parts": [{"text": "inicio"}], "repeatCount": 1},
    {"parts": [{"text": "ayuda"}], "repeatCount": 1},
    {"parts": [{"text": "asistencia"}], "repeatCount": 1},
    {"parts": [{"text": "estoy aquí"}], "repeatCount": 1},
    {"parts": [{"text": "presente"}], "repeatCount": 1},
    {"parts": [{"text": "quiero empezar"}], "repeatCount": 1},
    {"parts": [{"text": "vamos"}], "repeatCount": 1}
  ],
  "priority": 500000
}
JSON

# Reemplazar INTENT_PATH con la ruta real
sed -i.bak "s|INTENT_PATH|$AGENT_PATH/intents/$INTENT_ID|" /tmp/update-welcome.json

echo "📝 Actualizando intent con training phrases en español..."

# Actualizar el intent
RESPONSE=$(curl -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -H "Content-Type: application/json" \
    -d @/tmp/update-welcome.json \
    "$BASE_URL/$AGENT_PATH/intents/$INTENT_ID?languageCode=es&updateMask=trainingPhrases" \
    -s)

# Verificar respuesta
if echo "$RESPONSE" | grep -q "error"; then
    echo "⚠️ Error actualizando intent:"
    echo "$RESPONSE" | jq '.error.message' 2>/dev/null || echo "$RESPONSE"
else
    echo "✅ Intent actualizado exitosamente con training phrases en español"
fi

echo ""
echo "🎯 Training phrases agregadas:"
echo "  • hola / buenos días / buenas tardes"
echo "  • qué tal / cómo estás"
echo "  • necesito ayuda / puedes ayudarme"
echo "  • empezar / comenzar / inicio"
echo "  • ... y más variaciones de saludo"

echo ""
echo "💡 El Default Welcome Intent ahora reconocerá saludos en español"

# Limpiar archivos temporales
rm -f /tmp/update-welcome.json /tmp/update-welcome.json.bak
