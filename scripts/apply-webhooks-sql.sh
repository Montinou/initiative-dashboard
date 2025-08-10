#!/bin/bash

# Script para aplicar webhooks usando la API REST de Supabase
set -e

echo "=========================================="
echo "🔧 Aplicando Database Webhooks vía API"
echo "=========================================="
echo ""

SUPABASE_URL="https://zkkdnslupqnpioltjpeu.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw"

# Leer el archivo de migración
MIGRATION_FILE="/Users/agustinmontoya/Projectos/initiative-dashboard/supabase/migrations/20250809210000_create_database_webhooks_automatically.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo de migración"
    exit 1
fi

echo "📋 Archivo de migración encontrado"
echo ""

# Opción 1: Intentar con Supabase Management API
echo "1. Intentando aplicar mediante Management API..."

# Primero, obtener el token de acceso para la Management API
ACCESS_TOKEN_RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "tu-email@ejemplo.com",
    "password": "tu-password"
  }' 2>/dev/null || echo "{}")

# Si no funciona con Management API, usar método alternativo
echo ""
echo "2. Método alternativo: Instrucciones manuales"
echo ""
echo "=========================================="
echo "📝 INSTRUCCIONES PARA APLICAR WEBHOOKS"
echo "=========================================="
echo ""
echo "Opción A: Dashboard de Supabase (Más fácil)"
echo "-------------------------------------------"
echo "1. Abre este enlace en tu navegador:"
echo "   https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/sql/new"
echo ""
echo "2. Copia y pega el siguiente SQL:"
echo ""
echo "--- INICIO DEL SQL ---"
cat "$MIGRATION_FILE" | head -100
echo "..."
echo "--- (SQL completo en $MIGRATION_FILE) ---"
echo ""
echo "3. Haz clic en 'Run' para ejecutar"
echo ""
echo ""
echo "Opción B: Usando psql localmente"
echo "---------------------------------"
echo "1. Instala PostgreSQL client si no lo tienes:"
echo "   brew install postgresql"
echo ""
echo "2. Ejecuta:"
echo "   PGPASSWORD='tu-password-de-db' psql \\"
echo "     'postgresql://postgres.zkkdnslupqnpioltjpeu:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres' \\"
echo "     -f $MIGRATION_FILE"
echo ""
echo ""
echo "Opción C: Usando Supabase CLI con credenciales correctas"
echo "---------------------------------------------------------"
echo "1. Resetea tu contraseña de base de datos en:"
echo "   https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/settings/database"
echo ""
echo "2. Ejecuta:"
echo "   npx supabase db push"
echo "   (Ingresa la nueva contraseña cuando se solicite)"
echo ""

# Verificar que la Cloud Function esté lista
echo ""
echo "=========================================="
echo "✅ VERIFICACIÓN DE CLOUD FUNCTION"
echo "=========================================="
echo ""

FUNCTION_STATUS=$(gcloud functions describe syncSupabaseToBigQueryV2 \
  --region=us-central1 \
  --project=insaight-backend \
  --format="value(state)" 2>/dev/null || echo "NOT_FOUND")

if [ "$FUNCTION_STATUS" = "ACTIVE" ]; then
    echo "✅ Cloud Function syncSupabaseToBigQueryV2 está ACTIVA y lista"
    echo "   URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2"
else
    echo "⚠️  Cloud Function en estado: $FUNCTION_STATUS"
fi

echo ""
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo ""
echo "Una vez aplicada la migración, tendrás:"
echo ""
echo "✓ Webhooks automáticos para 9 tablas:"
echo "  - initiatives, activities, areas"
echo "  - user_profiles, objectives" 
echo "  - progress_history, objective_initiatives"
echo "  - organizations, tenants"
echo ""
echo "✓ Sincronización en tiempo real con BigQuery"
echo "✓ Captura de eventos INSERT, UPDATE, DELETE"
echo "✓ Cloud Function procesando los cambios"
echo ""
echo "Los webhooks NO aparecerán en el Dashboard de Supabase"
echo "porque son triggers de base de datos, no webhooks HTTP."
echo "Pero estarán funcionando automáticamente."