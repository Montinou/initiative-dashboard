#!/bin/bash

echo "Desplegando Webhook de Dialogflow CX..."

# Obtener Service Account Key de Supabase
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY ../../.env | cut -d '=' -f2)

gcloud functions deploy dialogflowWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point dialogflowWebhook \
  --source . \
  --region us-central1 \
  --project insaight-backend \
  --memory 1GB \
  --timeout 120s \
  --set-env-vars SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co,SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,GCLOUD_PROJECT_ID=insaight-backend \
  --gen2

echo ""
echo "✅ Webhook desplegado!"
echo ""
echo "URL del webhook para Dialogflow:"
echo "https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook"
echo ""
echo "Configurar en Dialogflow CX:"
echo "1. Ir a Dialogflow CX Console"
echo "2. Seleccionar el agente 'gestion-iniciativas-agent'"
echo "3. Ir a Manage → Webhooks"
echo "4. Crear webhook con la URL anterior"
echo "5. Configurar los Page handlers para usar el webhook"