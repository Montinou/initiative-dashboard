# Troubleshooting Dialogflow Messenger Widget

## El Problema

El widget de Dialogflow Messenger estaba mostrando el error:
```
POST https://dialogflow.cloud.google.com/v1/integrations/messenger/webhook/[agent-id]/sessions/[session-id] 404 (Not Found)
```

Este error ocurría incluso cuando el dominio estaba en la lista de dominios permitidos.

## Causa Raíz

El problema NO era de CORS o dominios permitidos. El error ocurría porque:

1. **URL del webhook incorrecta**: El widget estaba intentando usar `/v1/integrations/messenger/webhook/` que es un endpoint antiguo de Dialogflow ES
2. **Configuración incorrecta del script**: Se estaba usando el script de CX bootstrap en lugar del script de producción

## La Solución

### 1. Usar el código exacto del Console

Google Cloud Console proporciona el código exacto que debe usarse:

```html
<link rel="stylesheet" href="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css">
<script src="https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js"></script>
<df-messenger
  location="us-central1"
  project-id="insaight-backend"
  agent-id="7f297240-ca50-4896-8b71-e82fd707fa88"
  language-code="es"
  max-query-length="-1">
  <df-messenger-chat-bubble
    chat-title="Initiative Assistant with Gemini 2.5">
  </df-messenger-chat-bubble>
</df-messenger>
```

### 2. Scripts Correctos

- ✅ **CORRECTO**: `https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js`
- ❌ **INCORRECTO**: `https://www.gstatic.com/dialogflow-console/fast/messenger-cx/bootstrap.js`

### 3. Estructura HTML Correcta

El widget requiere la estructura anidada:
```html
<df-messenger>
  <df-messenger-chat-bubble>
  </df-messenger-chat-bubble>
</df-messenger>
```

## Dominios Permitidos

Los siguientes dominios están configurados en el Console:
- `siga-turismo.vercel.app`
- `fema-electricidad.vercel.app`
- `stratix.vercel.app`
- `ivh.me`
- `127-0-0-1.nip.io` (para desarrollo local)

### Para Desarrollo Local

En lugar de `localhost:3000`, usa:
```
http://127-0-0-1.nip.io:3000
```

## Componente React Actualizado

Se creó `DialogflowProductionWidget` que:
1. Carga dinámicamente los scripts correctos
2. Usa la estructura HTML exacta del Console
3. Aplica los estilos correctos
4. Maneja la limpieza al desmontar

## Verificación

Para verificar que funciona:

1. Abre la consola del navegador
2. No deberías ver errores 404 del webhook
3. El widget debería cargar correctamente
4. Puedes interactuar con el agente

## Si Aún Hay Problemas

1. **Verifica el agente en el Console**: 
   https://console.cloud.google.com/dialogflow/cx/projects/insaight-backend/locations/us-central1/agents/7f297240-ca50-4896-8b71-e82fd707fa88

2. **Verifica la integración de Messenger**:
   En el Console, ve a Integrations > Dialogflow Messenger

3. **Limpia caché del navegador**:
   Los scripts del widget se cachean agresivamente

4. **Verifica la consola del navegador**:
   Busca errores específicos de CORS o de carga de scripts

## Resumen

El problema principal era que se estaba usando una versión incorrecta del script de Dialogflow. Al usar el script de producción correcto y la estructura HTML exacta proporcionada por Google Cloud Console, el widget funciona correctamente en todos los dominios permitidos.