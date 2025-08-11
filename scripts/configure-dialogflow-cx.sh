#!/bin/bash

# Script para configurar Dialogflow CX con tools y generative features
# Requiere: gcloud CLI autenticado con permisos en el proyecto

PROJECT_ID="insaight-backend"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
LOCATION="us-central1"
WEBHOOK_URL="https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook"

echo "🤖 Configurando Dialogflow CX Agent..."
echo "Project: $PROJECT_ID"
echo "Agent: $AGENT_ID"
echo "Location: $LOCATION"

# 1. Configurar el webhook principal
echo "📡 Configurando webhook..."
cat > /tmp/webhook-config.json <<EOF
{
  "displayName": "Initiative Dashboard Webhook",
  "genericWebService": {
    "uri": "$WEBHOOK_URL",
    "requestHeaders": {
      "Content-Type": "application/json"
    },
    "timeout": "30s"
  }
}
EOF

gcloud alpha dialogflow cx webhooks create \
  --agent=$AGENT_ID \
  --location=$LOCATION \
  --project=$PROJECT_ID \
  --from-file=/tmp/webhook-config.json

# 2. Crear Tool: BigQuery Analytics
echo "🔧 Creando BigQuery Tool..."
cat > /tmp/bigquery-tool.json <<EOF
{
  "displayName": "BigQuery Analytics",
  "description": "Analiza datos de iniciativas y objetivos en BigQuery",
  "bigQueryConnection": {
    "datasetId": "gestion_iniciativas",
    "projectId": "$PROJECT_ID",
    "connectionMethod": "SERVICE_ACCOUNT"
  },
  "toolType": "BIGQUERY",
  "schemas": [
    {
      "name": "getInitiatives",
      "description": "Obtiene iniciativas filtradas por área, estado o progreso",
      "parameters": {
        "type": "object",
        "properties": {
          "area_id": {
            "type": "string",
            "description": "ID del área a filtrar"
          },
          "status": {
            "type": "string",
            "enum": ["planning", "in_progress", "on_hold", "completed"],
            "description": "Estado de la iniciativa"
          },
          "min_progress": {
            "type": "number",
            "description": "Progreso mínimo (0-100)"
          }
        }
      }
    },
    {
      "name": "getKPIMetrics",
      "description": "Obtiene métricas KPI del dashboard",
      "parameters": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "string",
            "description": "ID del tenant"
          },
          "timeframe": {
            "type": "string",
            "enum": ["week", "month", "quarter", "year"],
            "description": "Período de tiempo"
          }
        }
      }
    },
    {
      "name": "analyzeObjectiveProgress",
      "description": "Analiza el progreso de objetivos",
      "parameters": {
        "type": "object",
        "properties": {
          "objective_id": {
            "type": "string",
            "description": "ID del objetivo"
          },
          "include_initiatives": {
            "type": "boolean",
            "description": "Incluir iniciativas relacionadas"
          }
        }
      }
    }
  ]
}
EOF

# 3. Crear Tool: Webhook Functions
echo "🔧 Creando Webhook Tool..."
cat > /tmp/webhook-tool.json <<EOF
{
  "displayName": "Initiative Management Functions",
  "description": "Funciones para gestionar iniciativas y actividades",
  "toolType": "WEBHOOK",
  "webhookUri": "$WEBHOOK_URL",
  "schemas": [
    {
      "name": "createInitiative",
      "description": "Crea una nueva iniciativa con análisis inteligente",
      "parameters": {
        "type": "object",
        "required": ["title", "area_id"],
        "properties": {
          "title": {
            "type": "string",
            "description": "Título de la iniciativa"
          },
          "description": {
            "type": "string",
            "description": "Descripción detallada"
          },
          "area_id": {
            "type": "string",
            "description": "ID del área responsable"
          },
          "objective_id": {
            "type": "string",
            "description": "ID del objetivo relacionado"
          },
          "start_date": {
            "type": "string",
            "format": "date",
            "description": "Fecha de inicio (YYYY-MM-DD)"
          },
          "due_date": {
            "type": "string",
            "format": "date",
            "description": "Fecha de fin (YYYY-MM-DD)"
          }
        }
      }
    },
    {
      "name": "createActionPlan",
      "description": "Genera un plan de acción con actividades",
      "parameters": {
        "type": "object",
        "required": ["initiative_id"],
        "properties": {
          "initiative_id": {
            "type": "string",
            "description": "ID de la iniciativa"
          },
          "activities_count": {
            "type": "number",
            "description": "Número de actividades a generar",
            "minimum": 3,
            "maximum": 10
          },
          "based_on_success": {
            "type": "boolean",
            "description": "Basar en iniciativas exitosas similares"
          }
        }
      }
    },
    {
      "name": "analyzeTeamCapacity",
      "description": "Analiza la capacidad del equipo",
      "parameters": {
        "type": "object",
        "required": ["area_id"],
        "properties": {
          "area_id": {
            "type": "string",
            "description": "ID del área"
          },
          "include_forecast": {
            "type": "boolean",
            "description": "Incluir pronóstico de capacidad"
          }
        }
      }
    },
    {
      "name": "suggestImprovements",
      "description": "Sugiere mejoras basadas en análisis de datos",
      "parameters": {
        "type": "object",
        "properties": {
          "scope": {
            "type": "string",
            "enum": ["initiative", "area", "organization"],
            "description": "Alcance del análisis"
          },
          "focus": {
            "type": "string",
            "enum": ["efficiency", "quality", "speed", "resources"],
            "description": "Enfoque de las sugerencias"
          }
        }
      }
    }
  ]
}
EOF

# 4. Configurar Generative Features (Playbooks)
echo "✨ Configurando Generative Features..."
cat > /tmp/generative-config.json <<EOF
{
  "generativeSettings": {
    "enabled": true,
    "model": "gemini-2.0-flash-exp",
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "systemInstruction": "Eres un asistente experto en gestión de iniciativas y OKRs para la organización. 
    Tienes acceso a datos en tiempo real de BigQuery y puedes ejecutar acciones a través de webhooks.
    
    Contexto del usuario:
    - Tenant: Se obtiene del session mapping
    - Rol: Se obtiene del session mapping
    - Área: Se obtiene del session mapping
    
    Directrices:
    1. Siempre valida el contexto del usuario antes de ejecutar acciones
    2. Filtra datos según el tenant_id del usuario
    3. Respeta los permisos según el rol (CEO ve todo, Manager ve su área)
    4. Usa un tono profesional pero amigable
    5. Proporciona insights basados en datos
    6. Sugiere acciones concretas y medibles
    
    Capacidades:
    - Analizar datos de iniciativas y objetivos
    - Crear nuevas iniciativas con análisis inteligente
    - Generar planes de acción
    - Analizar capacidad del equipo
    - Sugerir mejoras basadas en patrones históricos"
  }
}
EOF

# 5. Configurar Default Start Flow con intent de bienvenida
echo "🎯 Configurando Default Start Flow..."
cat > /tmp/start-flow.json <<EOF
{
  "displayName": "Default Start Flow",
  "description": "Flujo inicial con bienvenida personalizada",
  "transitionRoutes": [
    {
      "intent": "Default Welcome Intent",
      "triggerFulfillment": {
        "messages": [
          {
            "text": {
              "text": [
                "¡Hola! Soy tu asistente de Initiative Dashboard potenciado con Gemini 2.0. 🚀",
                "Puedo ayudarte a:",
                "• 📊 Analizar el rendimiento de tus iniciativas",
                "• ✨ Crear nuevas iniciativas con análisis inteligente", 
                "• 📈 Generar reportes y métricas KPI",
                "• 👥 Analizar la capacidad de tu equipo",
                "• 💡 Sugerir mejoras basadas en datos históricos",
                "",
                "¿En qué puedo ayudarte hoy?"
              ]
            }
          }
        ],
        "setParameterActions": [
          {
            "parameter": "session_initialized",
            "value": true
          }
        ],
        "webhook": "$WEBHOOK_URL",
        "tag": "session-init"
      }
    }
  ]
}
EOF

# 6. Configurar Session Parameters
echo "🔐 Configurando Session Parameters..."
cat > /tmp/session-params.json <<EOF
{
  "parameters": [
    {
      "id": "session_id",
      "entityType": "@sys.any",
      "required": false,
      "description": "ID de sesión único del usuario"
    },
    {
      "id": "user_id", 
      "entityType": "@sys.any",
      "required": false,
      "description": "ID del usuario autenticado"
    },
    {
      "id": "tenant_id",
      "entityType": "@sys.any", 
      "required": false,
      "description": "ID del tenant del usuario"
    },
    {
      "id": "tenant_name",
      "entityType": "@sys.any",
      "required": false,
      "description": "Nombre del tenant"
    },
    {
      "id": "role",
      "entityType": "@sys.any",
      "required": false,
      "description": "Rol del usuario (ceo, admin, manager)"
    },
    {
      "id": "area_id",
      "entityType": "@sys.any",
      "required": false,
      "description": "ID del área del usuario"
    },
    {
      "id": "area_name",
      "entityType": "@sys.any",
      "required": false,
      "description": "Nombre del área"
    }
  ]
}
EOF

echo "✅ Configuración completada!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Asegúrate de que el webhook esté desplegado en Cloud Functions"
echo "2. Configura las credenciales de BigQuery en el Service Account"
echo "3. Actualiza las variables de entorno en el frontend:"
echo "   - NEXT_PUBLIC_DF_PROJECT_ID=$PROJECT_ID"
echo "   - NEXT_PUBLIC_DF_AGENT_ID=$AGENT_ID"
echo "   - NEXT_PUBLIC_DF_LOCATION=$LOCATION"
echo ""
echo "🔒 Seguridad:"
echo "- El webhook valida tenant/rol via session mapping"
echo "- Nunca confía en parámetros del cliente"
echo "- Usa Supabase Service Role Key para queries"
echo "- Aplica RLS según el contexto del usuario"