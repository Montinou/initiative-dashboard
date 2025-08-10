#!/bin/bash

# Script de validación de configuración de Dialogflow CX
set -e

echo "=========================================="
echo "🔍 Validación de Dialogflow CX"
echo "=========================================="
echo ""

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
FUNCTION_NAME="bot-stratix-backend-generative"
WEBHOOK_URL="https://$LOCATION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
  if [ "$1" = "ok" ]; then
    echo -e "${GREEN}✅ $2${NC}"
  elif [ "$1" = "warning" ]; then
    echo -e "${YELLOW}⚠️  $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

echo "📋 Configuración:"
echo "  Project ID: $PROJECT_ID"
echo "  Location: $LOCATION"
echo "  Agent ID: $AGENT_ID"
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

# 1. Verificar que gcloud esté configurado
echo "1. Verificando configuración de gcloud..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" = "$PROJECT_ID" ]; then
  print_status "ok" "gcloud configurado correctamente para proyecto $PROJECT_ID"
else
  print_status "warning" "gcloud apunta a proyecto $CURRENT_PROJECT, esperado $PROJECT_ID"
fi

# 2. Verificar que las APIs estén habilitadas
echo ""
echo "2. Verificando APIs habilitadas..."
APIS_REQUIRED=("dialogflow.googleapis.com" "cloudfunctions.googleapis.com" "aiplatform.googleapis.com")
for api in "${APIS_REQUIRED[@]}"; do
  if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
    print_status "ok" "API $api habilitada"
  else
    print_status "error" "API $api NO está habilitada"
  fi
done

# 3. Verificar el agente de Dialogflow
echo ""
echo "3. Verificando agente de Dialogflow CX..."
ACCESS_TOKEN=$(gcloud auth print-access-token)
AGENT_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}" 2>/dev/null)

if echo "$AGENT_RESPONSE" | grep -q "displayName"; then
  AGENT_NAME=$(echo "$AGENT_RESPONSE" | jq -r '.displayName')
  print_status "ok" "Agente encontrado: $AGENT_NAME"
else
  print_status "error" "No se pudo acceder al agente"
fi

# 4. Verificar webhooks configurados
echo ""
echo "4. Verificando webhooks..."
WEBHOOKS=$(curl -s -X GET \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/webhooks" 2>/dev/null)

WEBHOOK_COUNT=$(echo "$WEBHOOKS" | jq '.webhooks | length')
if [ "$WEBHOOK_COUNT" -gt 0 ]; then
  print_status "ok" "Se encontraron $WEBHOOK_COUNT webhook(s)"
  echo "$WEBHOOKS" | jq -r '.webhooks[] | "    - \(.displayName): \(.genericWebService.uri)"'
else
  print_status "warning" "No se encontraron webhooks configurados"
fi

# 5. Verificar Cloud Function
echo ""
echo "5. Verificando Cloud Function..."
FUNCTION_STATUS=$(gcloud functions describe $FUNCTION_NAME --region=$LOCATION --project=$PROJECT_ID --format="value(state)" 2>/dev/null || echo "NOT_FOUND")

if [ "$FUNCTION_STATUS" = "ACTIVE" ]; then
  print_status "ok" "Cloud Function está activa"
  
  # Verificar variables de entorno
  echo "   Verificando variables de entorno..."
  ENV_VARS=$(gcloud functions describe $FUNCTION_NAME --region=$LOCATION --project=$PROJECT_ID --format="get(serviceConfig.environmentVariables)" 2>/dev/null)
  
  if echo "$ENV_VARS" | grep -q "SUPABASE_URL"; then
    print_status "ok" "Variable SUPABASE_URL configurada"
  else
    print_status "error" "Variable SUPABASE_URL NO configurada"
  fi
  
  if echo "$ENV_VARS" | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    print_status "ok" "Variable SUPABASE_SERVICE_ROLE_KEY configurada"
  else
    print_status "error" "Variable SUPABASE_SERVICE_ROLE_KEY NO configurada"
  fi
elif [ "$FUNCTION_STATUS" = "NOT_FOUND" ]; then
  print_status "error" "Cloud Function no existe"
else
  print_status "warning" "Cloud Function en estado: $FUNCTION_STATUS"
fi

# 6. Probar webhook con curl
echo ""
echo "6. Probando webhook directamente..."
TEST_PAYLOAD='{
  "sessionInfo": {
    "session": "projects/'$PROJECT_ID'/locations/'$LOCATION'/agents/'$AGENT_ID'/sessions/test-session",
    "parameters": {}
  },
  "fulfillmentInfo": {
    "tag": "test"
  },
  "text": "Hola"
}'

WEBHOOK_TEST=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD" \
  "$WEBHOOK_URL" 2>/dev/null)

if echo "$WEBHOOK_TEST" | grep -q "sessionInfo\|fulfillmentResponse"; then
  print_status "ok" "Webhook responde correctamente"
else
  print_status "warning" "Webhook no responde el formato esperado"
  echo "   Respuesta: $(echo $WEBHOOK_TEST | head -c 100)..."
fi

# 7. Verificar allowed origins
echo ""
echo "7. Verificando allowed origins..."
SECURITY_SETTINGS=$(echo "$AGENT_RESPONSE" | jq -r '.securitySettings.allowedOrigins[]' 2>/dev/null)
if [ ! -z "$SECURITY_SETTINGS" ]; then
  print_status "ok" "Allowed origins configurados:"
  echo "$AGENT_RESPONSE" | jq -r '.securitySettings.allowedOrigins[]' | while read origin; do
    echo "    - $origin"
  done
else
  print_status "warning" "No hay allowed origins configurados"
fi

# 8. URLs útiles
echo ""
echo "=========================================="
echo "📚 URLs útiles:"
echo "=========================================="
echo ""
echo "🧪 Test Agent:"
echo "   https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/test"
echo ""
echo "⚙️  Configuración del agente:"
echo "   https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"
echo ""
echo "🔌 Webhooks:"
echo "   https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/webhooks"
echo ""
echo "📊 Logs de Cloud Function:"
echo "   https://console.cloud.google.com/functions/details/$LOCATION/$FUNCTION_NAME?project=$PROJECT_ID&tab=logs"
echo ""
echo "🌐 Página de prueba local:"
echo "   http://localhost:3000/test-ai"
echo ""

# Resumen final
echo "=========================================="
echo "📋 Resumen de validación"
echo "=========================================="
echo ""
if [ "$FUNCTION_STATUS" = "ACTIVE" ] && [ "$WEBHOOK_COUNT" -gt 0 ]; then
  print_status "ok" "La configuración parece estar completa"
  echo ""
  echo "✨ Próximos pasos:"
  echo "   1. Abre el Test Agent en la URL proporcionada"
  echo "   2. Prueba con mensajes como 'Hola' o 'Muéstrame las iniciativas'"
  echo "   3. Verifica los logs de la Cloud Function si hay errores"
  echo "   4. Prueba el widget en http://localhost:3000/test-ai"
else
  print_status "warning" "Hay algunos elementos que requieren atención"
  echo ""
  echo "⚠️  Revisa los elementos marcados con warning o error arriba"
fi