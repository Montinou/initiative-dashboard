#!/bin/bash

# Script para actualizar intents en Dialogflow CX usando gcloud

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"

echo "🚀 Actualizando intents en Dialogflow CX..."
echo "📍 Proyecto: $PROJECT_ID"
echo "📍 Ubicación: $LOCATION"
echo "📍 Agent ID: $AGENT_ID"
echo ""

# Autenticar con gcloud
echo "🔐 Verificando autenticación..."
gcloud auth application-default print-access-token > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ No estás autenticado. Ejecuta: gcloud auth application-default login"
    exit 1
fi

TOKEN=$(gcloud auth application-default print-access-token)
echo "✅ Token obtenido"
echo ""

# Base URL para la API
BASE_URL="https://$LOCATION-dialogflow.googleapis.com/v3"
AGENT_PATH="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

# Función para crear un intent
create_intent() {
    local display_name=$1
    local training_phrases=$2
    
    echo "📝 Creando intent: $display_name"
    
    # Crear el JSON del intent
    cat > /tmp/intent.json <<EOF
{
  "displayName": "$display_name",
  "trainingPhrases": $training_phrases,
  "priority": 500000
}
EOF
    
    # Enviar la petición
    curl -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -H "x-goog-user-project: $PROJECT_ID" \
        -d @/tmp/intent.json \
        "$BASE_URL/$AGENT_PATH/intents?languageCode=es" \
        -s -o /tmp/response.json
    
    # Verificar respuesta
    if grep -q "error" /tmp/response.json; then
        echo "⚠️  Error creando intent $display_name"
        cat /tmp/response.json | jq '.error.message' 2>/dev/null || cat /tmp/response.json
    else
        echo "✅ Intent creado exitosamente"
    fi
    
    rm -f /tmp/intent.json /tmp/response.json
    sleep 1
}

# Intent para mostrar iniciativas
PHRASES_INICIATIVAS='[
  {"parts": [{"text": "muéstrame las iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "mostrar iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "ver iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "dame las iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "lista de iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "todas las iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "consultar iniciativas"}], "repeatCount": 1},
  {"parts": [{"text": "qué iniciativas hay"}], "repeatCount": 1}
]'

create_intent "query_initiatives_spanish" "$PHRASES_INICIATIVAS"

# Intent para mostrar objetivos
PHRASES_OBJETIVOS='[
  {"parts": [{"text": "muéstrame los objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "mostrar objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "ver objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "dame los objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "lista de objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "todos los objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "consultar objetivos"}], "repeatCount": 1},
  {"parts": [{"text": "qué objetivos hay"}], "repeatCount": 1}
]'

create_intent "query_objectives_spanish" "$PHRASES_OBJETIVOS"

# Intent para mostrar actividades
PHRASES_ACTIVIDADES='[
  {"parts": [{"text": "muéstrame las actividades"}], "repeatCount": 1},
  {"parts": [{"text": "mostrar actividades"}], "repeatCount": 1},
  {"parts": [{"text": "ver actividades"}], "repeatCount": 1},
  {"parts": [{"text": "dame las actividades"}], "repeatCount": 1},
  {"parts": [{"text": "lista de actividades"}], "repeatCount": 1},
  {"parts": [{"text": "todas las actividades"}], "repeatCount": 1},
  {"parts": [{"text": "actividades pendientes"}], "repeatCount": 1},
  {"parts": [{"text": "tareas pendientes"}], "repeatCount": 1}
]'

create_intent "query_activities_spanish" "$PHRASES_ACTIVIDADES"

# Intent para crear objetivo
PHRASES_CREAR_OBJETIVO='[
  {"parts": [{"text": "crear un nuevo objetivo"}], "repeatCount": 1},
  {"parts": [{"text": "agregar objetivo"}], "repeatCount": 1},
  {"parts": [{"text": "nuevo objetivo"}], "repeatCount": 1},
  {"parts": [{"text": "añadir un objetivo"}], "repeatCount": 1},
  {"parts": [{"text": "registrar objetivo"}], "repeatCount": 1},
  {"parts": [{"text": "establecer un objetivo"}], "repeatCount": 1}
]'

create_intent "create_objective_spanish" "$PHRASES_CREAR_OBJETIVO"

# Intent para crear actividad
PHRASES_CREAR_ACTIVIDAD='[
  {"parts": [{"text": "crear una nueva actividad"}], "repeatCount": 1},
  {"parts": [{"text": "agregar actividad"}], "repeatCount": 1},
  {"parts": [{"text": "nueva actividad"}], "repeatCount": 1},
  {"parts": [{"text": "añadir una actividad"}], "repeatCount": 1},
  {"parts": [{"text": "crear tarea"}], "repeatCount": 1},
  {"parts": [{"text": "agregar tarea"}], "repeatCount": 1}
]'

create_intent "create_activity_spanish" "$PHRASES_CREAR_ACTIVIDAD"

# Intent para asignar actividad
PHRASES_ASIGNAR='[
  {"parts": [{"text": "asignar actividad a juan"}], "repeatCount": 1},
  {"parts": [{"text": "asigna esta tarea a maría"}], "repeatCount": 1},
  {"parts": [{"text": "delegar actividad a pedro"}], "repeatCount": 1},
  {"parts": [{"text": "reasignar actividad"}], "repeatCount": 1},
  {"parts": [{"text": "cambiar responsable"}], "repeatCount": 1},
  {"parts": [{"text": "transferir actividad"}], "repeatCount": 1}
]'

create_intent "assign_activity_spanish" "$PHRASES_ASIGNAR"

echo ""
echo "✨ Proceso completado!"
echo "💡 Ve a la consola de Dialogflow CX y:"
echo "   1. Verifica que los intents se crearon"
echo "   2. Conecta los intents con los flows y pages correspondientes"
echo "   3. Haz clic en 'Train' para entrenar el agente"
echo "   4. Prueba en el simulador con frases en español"