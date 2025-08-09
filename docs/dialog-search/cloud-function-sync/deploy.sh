#!/bin/bash

# Script para desplegar Cloud Function de sincronización

PROJECT_ID="insaight-backend"
FUNCTION_NAME="syncSupabaseToBigQuery"
REGION="us-central1"

echo "Desplegando Cloud Function para sincronización..."
echo "================================================"
echo ""

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Desplegar función
gcloud functions deploy ${FUNCTION_NAME} \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point syncSupabaseToBigQuery \
  --source . \
  --region ${REGION} \
  --memory 256MB \
  --timeout 60s \
  --env-vars-file .env.yaml \
  --project ${PROJECT_ID}

echo ""
echo "Función desplegada!"
echo ""
echo "URL del webhook:"
echo "https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"
echo ""
echo "Para probar:"
echo "curl -X GET https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"