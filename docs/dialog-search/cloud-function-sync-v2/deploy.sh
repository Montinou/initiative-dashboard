#!/bin/bash

echo "Desplegando Cloud Function v2 con soporte multi-tabla..."

gcloud functions deploy syncSupabaseToBigQueryV2 \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point syncSupabaseToBigQuery \
  --source . \
  --region us-central1 \
  --project insaight-backend \
  --memory 512MB \
  --timeout 60s \
  --set-env-vars GCLOUD_PROJECT_ID=insaight-backend,BIGQUERY_DATASET=gestion_iniciativas,WEBHOOK_SECRET=sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8 \
  --gen2

echo ""
echo "✅ Cloud Function desplegada!"
echo ""
echo "URL del webhook:"
echo "https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2"
echo ""
echo "Test manual:"
echo "curl 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2?token=sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'"