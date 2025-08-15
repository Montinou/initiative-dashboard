# Configuración Final de Vercel para Vertex AI con Secret Manager

## Configuración Requerida en Vercel

Solo necesitas agregar UNA variable de entorno en Vercel para que funcione Vertex AI:

### 1. Obtener la clave codificada en Base64

Ejecuta este comando para obtener la clave de la cuenta de servicio en formato Base64:

```bash
cat /tmp/app-engine-sa-key-base64.txt
```

O si no tienes el archivo, puedes obtenerlo del secret:

```bash
gcloud secrets versions access latest --secret="vercel-gcp-credentials" --project=insaight-backend | base64
```

### 2. Agregar a Vercel

En el dashboard de Vercel, agrega esta única variable de entorno:

```
GOOGLE_APPLICATION_CREDENTIALS_JSON=<pega aquí el contenido base64 del paso anterior>
```

**IMPORTANTE**: 
- El valor debe ser la cadena Base64 completa sin saltos de línea
- NO incluyas comillas alrededor del valor
- Esta es la ÚNICA variable necesaria para Vertex AI

### 3. Variables ya configuradas

Estas variables ya deberían estar configuradas en Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu clave anon>
SUPABASE_SERVICE_ROLE_KEY=<tu clave de servicio>
GCP_PROJECT_ID=insaight-backend
```

## Cómo funciona

1. **En desarrollo local**: Usa las credenciales de `gcloud auth application-default login`
2. **En Vercel**: 
   - Usa `GOOGLE_APPLICATION_CREDENTIALS_JSON` para autenticarse con GCP
   - Accede a Secret Manager para obtener las credenciales de Vertex AI
   - Usa esas credenciales para llamar a Gemini 2.5 Flash

## Arquitectura de seguridad

```
Vercel App 
  ↓ (usa insaight-backend@appspot.gserviceaccount.com)
Secret Manager API
  ↓ (lee vertex-ai-service-account secret)
Credenciales de Vertex AI
  ↓ (usa vertex-ai-agent@insaight-backend.iam.gserviceaccount.com)
Vertex AI API (Gemini 2.5 Flash)
```

## Ventajas de este enfoque

1. **Sin credenciales sensibles en Vercel**: Solo una cuenta de servicio con permisos mínimos
2. **Rotación fácil**: Puedes rotar las credenciales de Vertex AI sin tocar Vercel
3. **Auditoría completa**: Todo acceso a secrets queda registrado en GCP
4. **Separación de responsabilidades**: 
   - La cuenta de App Engine solo puede leer secrets
   - La cuenta de Vertex AI solo puede usar la API de IA

## Prueba después del despliegue

1. Haz push a main para desplegar:
```bash
git push origin main
```

2. Espera a que termine el despliegue (~2 minutos)

3. Verifica en: https://siga-turismo.vercel.app

4. Prueba la funcionalidad de chat con Gemini

## Monitoreo

Para ver los logs de acceso a Secret Manager:
```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret AND resource.labels.secret_id=vertex-ai-service-account" \
  --limit=10 \
  --project=insaight-backend
```

Para ver los logs de Vertex AI:
```bash
gcloud logging read "resource.type=aiplatform.googleapis.com/Model" \
  --limit=10 \
  --project=insaight-backend
```

## Troubleshooting

Si ves errores de autenticación:

1. Verifica que la variable `GOOGLE_APPLICATION_CREDENTIALS_JSON` esté configurada
2. Verifica que sea Base64 válido sin saltos de línea
3. Revisa los logs de la función en Vercel
4. Verifica los permisos en GCP:

```bash
# Verificar que la cuenta de servicio tenga acceso al secret
gcloud secrets get-iam-policy vertex-ai-service-account --project=insaight-backend

# Debería mostrar:
# - serviceAccount:insaight-backend@appspot.gserviceaccount.com con role: roles/secretmanager.secretAccessor
```