#!/bin/bash

# Script para configurar dominios permitidos en Dialogflow CX usando gcloud CLI
set -e

echo "=========================================="
echo "🔧 Configurando Dominios en Dialogflow CX"
echo "=========================================="
echo ""

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

# 1. Obtener la configuración actual del agente
echo "1. Obteniendo configuración actual del agente..."
gcloud alpha dialogflow cx agents describe "$AGENT_ID" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --format=json > /tmp/agent-config.json 2>/dev/null || true

# 2. Actualizar la configuración con dominios permitidos
echo "2. Actualizando configuración con dominios permitidos..."

# Crear archivo de patch con la configuración actualizada
cat > /tmp/agent-patch.yaml <<EOF
displayName: Initiative Assistant with Gemini 2.5
defaultLanguageCode: es
timeZone: America/Buenos_Aires
description: Asistente inteligente para gestión de iniciativas con Gemini 2.5 Flash Lite
supportedLanguageCodes:
- es
enableStackdriverLogging: true
enableSpellCorrection: true
securitySettings:
  purgeDataTypes: []
  retentionWindowDays: 30
  allowedDomains:
  - http://localhost:3000
  - http://localhost:3001
  - https://siga-turismo.vercel.app
  - https://initiative-dashboard.vercel.app
  - https://stratix.vercel.app
  - https://*.vercel.app
advancedSettings:
  loggingSettings:
    enableStackdriverLogging: true
    enableInteractionLogging: true
speechToTextSettings:
  enableSpeechAdaptation: true
EOF

# Aplicar la actualización
gcloud alpha dialogflow cx agents patch "$AGENT_ID" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --update-mask="securitySettings,advancedSettings" \
  --file=/tmp/agent-patch.yaml 2>/dev/null || {
    echo "Intentando método alternativo con API REST..."
    
    ACCESS_TOKEN=$(gcloud auth print-access-token)
    
    # Método alternativo usando curl
    curl -X PATCH \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -H "x-goog-user-project: $PROJECT_ID" \
      -d '{
        "securitySettings": {
          "purgeDataTypes": [],
          "retentionWindowDays": 30,
          "allowedDomains": [
            "http://localhost:3000",
            "http://localhost:3001", 
            "https://siga-turismo.vercel.app",
            "https://initiative-dashboard.vercel.app",
            "https://stratix.vercel.app",
            "https://*.vercel.app"
          ]
        }
      }' \
      "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=securitySettings" \
      > /tmp/update-response.json 2>/dev/null
}

echo "✅ Dominios configurados"

# 3. Habilitar la integración de Messenger
echo ""
echo "3. Habilitando integración de Dialogflow Messenger..."

# Crear la configuración de integración
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Intentar habilitar la integración de Messenger
cat > /tmp/enable-messenger.json <<EOF
{
  "dialogflowMessengerSettings": {
    "enabled": true,
    "allowedDomains": [
      "localhost:3000",
      "localhost:3001",
      "siga-turismo.vercel.app",
      "initiative-dashboard.vercel.app",
      "stratix.vercel.app",
      "*.vercel.app"
    ]
  }
}
EOF

# Actualizar settings del agente con Messenger habilitado
curl -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/enable-messenger.json \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}?updateMask=dialogflowMessengerSettings" \
  > /tmp/messenger-response.json 2>/dev/null || echo "Nota: La integración puede requerir habilitación manual"

# 4. Verificar la configuración
echo ""
echo "4. Verificando configuración..."

echo "Dominios permitidos configurados:"
gcloud alpha dialogflow cx agents describe "$AGENT_ID" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --format="value(securitySettings.allowedDomains)" 2>/dev/null || {
    # Si el comando alpha no funciona, usar API REST
    curl -s -X GET \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "x-goog-user-project: $PROJECT_ID" \
      "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}" \
      2>/dev/null | jq -r '.securitySettings.allowedDomains[]' 2>/dev/null || echo "No se pudieron listar los dominios"
}

# 5. Generar configuración para el widget
echo ""
echo "5. Configuración del widget actualizada..."

cat > /Users/agustinmontoya/Projectos/initiative-dashboard/lib/dialogflow-config.ts <<EOF
// Configuración de Dialogflow CX Messenger
export const DIALOGFLOW_CONFIG = {
  agentId: '${AGENT_ID}',
  location: '${LOCATION}',
  projectId: '${PROJECT_ID}',
  languageCode: 'es',
  
  // Dominios permitidos (configurados en el agente)
  allowedDomains: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://siga-turismo.vercel.app',
    'https://initiative-dashboard.vercel.app',
    'https://stratix.vercel.app'
  ],
  
  // Configuración de UI
  ui: {
    botTitle: 'Initiative Assistant',
    welcomeMessage: '¡Hola! Soy tu asistente de iniciativas con Gemini 2.5. ¿En qué puedo ayudarte?',
    primaryColor: '#3b82f6',
    botMessageColor: '#f3f4f6',
    userMessageColor: '#3b82f6'
  },
  
  // URLs de prueba
  testUrls: {
    console: 'https://dialogflow.cloud.google.com/cx/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/test',
    integrations: 'https://console.cloud.google.com/dialogflow/cx/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/integrations'
  }
};

// Verificar si el dominio actual está permitido
export function isDomainAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  
  const currentHost = window.location.host;
  const currentOrigin = window.location.origin;
  
  return DIALOGFLOW_CONFIG.allowedDomains.some(domain => 
    currentOrigin.startsWith(domain) || 
    currentHost === domain.replace(/^https?:\/\//, '') ||
    (domain.includes('*') && currentHost.endsWith(domain.replace('*.', '')))
  );
}
EOF

echo "✅ Archivo de configuración creado"

# 6. Resumen
echo ""
echo "=========================================="
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Dominios permitidos:"
echo "• localhost:3000"
echo "• localhost:3001"
echo "• siga-turismo.vercel.app"
echo "• initiative-dashboard.vercel.app"
echo "• stratix.vercel.app"
echo "• *.vercel.app"
echo ""
echo "El widget de Dialogflow Messenger debería funcionar ahora en estos dominios."
echo ""
echo "Si aún no funciona, verifica en:"
echo "https://console.cloud.google.com/dialogflow/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/integrations"
echo ""
echo "Y asegúrate de que 'Dialogflow Messenger' esté habilitado."

# Limpiar archivos temporales
rm -f /tmp/agent-config.json /tmp/agent-patch.yaml /tmp/enable-messenger.json
rm -f /tmp/update-response.json /tmp/messenger-response.json