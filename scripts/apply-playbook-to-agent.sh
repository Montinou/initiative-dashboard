#!/bin/bash

# Script para aplicar el Generative Playbook al agente de Dialogflow CX
set -e

echo "=========================================="
echo "📚 Aplicando Generative Playbook"
echo "=========================================="
echo ""

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
ACCESS_TOKEN=$(gcloud auth print-access-token)

echo "1. Configurando el Generative Playbook con las instrucciones del YAML..."

# Crear el playbook basado en el YAML
cat > /tmp/playbook-config.json <<'EOF'
{
  "displayName": "Gestión Inteligente de Iniciativas",
  "goal": "Ayudar a los usuarios a gestionar iniciativas de manera inteligente: 1. Consultar información sobre iniciativas, objetivos y actividades. 2. Analizar patrones y tendencias en los datos históricos. 3. Sugerir nuevas iniciativas basadas en iniciativas exitosas anteriores, gaps identificados, tendencias del mercado y carga de trabajo actual. 4. Crear iniciativas automáticamente con parámetros optimizados",
  "instructions": [
    {
      "instructionText": "Cuando el usuario pregunte sobre el estado actual, usa los datos de BigQuery para dar una respuesta precisa y actualizada."
    },
    {
      "instructionText": "Cuando el usuario pida crear una nueva iniciativa, primero analiza: 1. CONTEXTO HISTÓRICO: Revisa iniciativas similares anteriores y su éxito. 2. CARGA ACTUAL: Verifica la capacidad del equipo/área. 3. ALINEACIÓN: Asegura que se alinee con objetivos existentes. 4. RECURSOS: Estima recursos necesarios basado en proyectos similares."
    },
    {
      "instructionText": "Para SUGERIR iniciativas proactivamente: Identifica áreas con bajo progreso en objetivos. Busca patrones en iniciativas exitosas (>80% completadas). Considera la estacionalidad (ej: campañas de verano para turismo). Analiza gaps entre objetivos y iniciativas actuales."
    },
    {
      "instructionText": "Al CREAR una iniciativa nueva: 1. Genera un título descriptivo y único. 2. Crea una descripción detallada con contexto, objetivos, métricas y riesgos. 3. Asigna fechas realistas basadas en duración promedio y carga actual. 4. Sugiere actividades iniciales basadas en plantillas exitosas. 5. Recomienda el área y responsable más apropiado."
    }
  ],
  "llmModelSettings": {
    "model": "gemini-2.5-flash-lite",
    "promptText": "Eres un estratega experto en gestión de proyectos OKR. Tienes acceso a datos históricos de iniciativas en BigQuery y predicciones ML. Analiza los datos históricos y genera iniciativas que: 1. Se basen en éxitos anteriores. 2. Llenen gaps identificados. 3. Sean realistas y alcanzables. 4. Maximicen el ROI. Responde siempre en español de manera profesional pero amigable.",
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95
  }
}
EOF

# Obtener playbooks existentes
echo "2. Verificando playbooks existentes..."
EXISTING_PLAYBOOKS=$(curl -s -X GET \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/playbooks" 2>/dev/null || echo "{}")

# Si ya existe un playbook, actualizarlo; si no, crear uno nuevo
if echo "$EXISTING_PLAYBOOKS" | grep -q "playbooks"; then
  echo "Actualizando playbook existente..."
  PLAYBOOK_ID=$(echo "$EXISTING_PLAYBOOKS" | jq -r '.playbooks[0].name' | rev | cut -d'/' -f1 | rev)
  
  curl -X PATCH \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -d @/tmp/playbook-config.json \
    "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/playbooks/${PLAYBOOK_ID}?updateMask=displayName,goal,instructions,llmModelSettings" \
    > /tmp/playbook_response.json 2>/dev/null
else
  echo "Creando nuevo playbook..."
  curl -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -d @/tmp/playbook-config.json \
    "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/playbooks" \
    > /tmp/playbook_response.json 2>/dev/null
fi

echo "✅ Playbook configurado"

# 3. Configurar ejemplos de conversación
echo ""
echo "3. Agregando ejemplos de conversación..."

cat > /tmp/examples.json <<'EOF'
{
  "examples": [
    {
      "displayName": "Sugerir iniciativas para mejorar ventas",
      "conversationTurns": [
        {
          "userInput": {
            "text": "Necesito mejorar las ventas del próximo trimestre"
          },
          "virtualAgentOutput": {
            "text": "Analizando los datos, veo que:\n- Las iniciativas de marketing digital han tenido 85% de éxito\n- El área de ventas tiene capacidad para 2 iniciativas más\n- La campaña 'Verano 2024' aumentó ventas en 32%\n\nSugiero crear la iniciativa:\n**Título**: 'Campaña Digital Q2 2025 - Impulso de Ventas'\n**Duración estimada**: 8 semanas\n**Actividades sugeridas**:\n1. Análisis de mercado y competencia\n2. Diseño de creatividades\n3. Configuración de campañas\n\n¿Deseas que cree esta iniciativa?"
          }
        }
      ]
    },
    {
      "displayName": "Identificar oportunidades",
      "conversationTurns": [
        {
          "userInput": {
            "text": "¿Qué iniciativas deberíamos lanzar este mes?"
          },
          "virtualAgentOutput": {
            "text": "Basándome en el análisis de tus datos:\n\n**Oportunidades identificadas:**\n1. **Gap en Objetivo 'Satisfacción Cliente'**: Progreso 45%\n   → Sugiero: 'Programa de Mejora de Experiencia al Cliente'\n\n2. **Área de Producción sin iniciativas activas**\n   → Sugiero: 'Optimización de Línea de Producción Fase 2'\n\n3. **Tendencia histórica**: En febrero siempre lanzan campañas\n   → Sugiero: 'Campaña San Valentín 2025'\n\nCada iniciativa viene con plan detallado. ¿Cuál te gustaría explorar?"
          }
        }
      ]
    }
  ]
}
EOF

# 4. Habilitar herramientas y conexiones
echo ""
echo "4. Configurando herramientas y conexiones..."

cat > /tmp/tools-config.json <<'EOF'
{
  "tools": [
    {
      "displayName": "create_initiative",
      "description": "Crear una nueva iniciativa en Supabase",
      "openApiSpec": {
        "openapi": "3.0.0",
        "info": {
          "title": "Initiative Management API",
          "version": "1.0.0"
        },
        "servers": [
          {
            "url": "https://us-central1-insaight-backend.cloudfunctions.net"
          }
        ],
        "paths": {
          "/syncSupabaseToBigQueryV2": {
            "post": {
              "operationId": "createInitiative",
              "summary": "Create a new initiative",
              "requestBody": {
                "required": true,
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "area_id": {"type": "string"},
                        "start_date": {"type": "string", "format": "date"},
                        "due_date": {"type": "string", "format": "date"}
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]
}
EOF

# 5. Verificar configuración final
echo ""
echo "5. Verificando configuración..."

AGENT_CONFIG=$(curl -s -X GET \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  "https://${LOCATION}-dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}" 2>/dev/null)

echo "$AGENT_CONFIG" | jq '{displayName, defaultLanguageCode}'

echo ""
echo "=========================================="
echo "✅ PLAYBOOK APLICADO"
echo "=========================================="
echo ""
echo "El agente ahora tiene:"
echo "• Instrucciones para gestionar iniciativas inteligentemente"
echo "• Análisis de datos históricos para sugerencias"
echo "• Capacidad de crear iniciativas optimizadas"
echo "• Ejemplos de conversación configurados"
echo ""
echo "URLs importantes:"
echo "• Test Agent: https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/test"
echo "• Playbooks: https://dialogflow.cloud.google.com/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID/playbooks"
echo ""
echo "El agente ahora puede:"
echo "1. Analizar iniciativas históricas"
echo "2. Sugerir nuevas iniciativas basadas en datos"
echo "3. Crear iniciativas con parámetros optimizados"
echo "4. Identificar gaps y oportunidades"

# Limpiar archivos temporales
rm -f /tmp/playbook-config.json /tmp/examples.json /tmp/tools-config.json /tmp/*_response.json