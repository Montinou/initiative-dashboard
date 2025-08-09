#!/bin/bash

# Script para crear agente de Dialogflow CX

PROJECT_ID="insaight-backend"
PROJECT_NUMBER="30705406738"
LOCATION="global"
AGENT_NAME="asistente-de-iniciativas"

# Obtener token de acceso
ACCESS_TOKEN=$(gcloud auth print-access-token --project=${PROJECT_ID})

echo "Creando agente de Dialogflow CX..."
echo "Project: ${PROJECT_ID}"
echo "Location: ${LOCATION}"
echo "Agent: ${AGENT_NAME}"
echo ""

# Crear el agente
curl -X POST \
  "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: ${PROJECT_ID}" \
  -d '{
    "displayName": "'"${AGENT_NAME}"'",
    "defaultLanguageCode": "es",
    "timeZone": "America/Argentina/Buenos_Aires",
    "description": "Asistente para gestión de iniciativas y planes de acción",
    "supportedLanguageCodes": ["es", "en"],
    "enableStackdriverLogging": true,
    "enableSpellCorrection": true
  }'

echo ""
echo "Agent creation initiated. Check the console for status."