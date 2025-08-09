#!/bin/bash

# Script para probar el agente de Dialogflow CX

PROJECT_ID="insaight-backend"
LOCATION="global"
AGENT_ID="6e2f8db9-f5ca-435e-b2ed-80622f5a60f5"
SESSION_ID="test-session-$(date +%s)"

# Obtener token de acceso
ACCESS_TOKEN=$(gcloud auth print-access-token --project=${PROJECT_ID})

echo "Probando el Agente de Dialogflow CX"
echo "===================================="
echo "Project: ${PROJECT_ID}"
echo "Agent: ${AGENT_ID}"
echo "Session: ${SESSION_ID}"
echo ""

# Función para enviar mensaje al agente
send_message() {
    local text="$1"
    echo "👤 Usuario: $text"
    echo ""
    
    RESPONSE=$(curl -s -X POST \
      "https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/sessions/${SESSION_ID}:detectIntent" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -H "x-goog-user-project: ${PROJECT_ID}" \
      -d '{
        "queryInput": {
          "text": {
            "text": "'"$text"'"
          },
          "languageCode": "es"
        }
      }')
    
    # Extraer y mostrar la respuesta
    echo "🤖 Agente:"
    echo "$RESPONSE" | python3 -c "
import sys
import json
try:
    data = json.load(sys.stdin)
    if 'queryResult' in data:
        result = data['queryResult']
        if 'responseMessages' in result:
            for msg in result['responseMessages']:
                if 'text' in msg:
                    for text in msg['text']['text']:
                        print(f'   {text}')
                elif 'knowledgeInfoCard' in msg:
                    print('   [Información de Knowledge Base mostrada]')
        if 'knowledgeSearchResults' in result:
            print('\\n   📚 Resultados de búsqueda:')
            for i, result in enumerate(result['knowledgeSearchResults'], 1):
                if 'answer' in result:
                    print(f'   {i}. {result[\"answer\"][:100]}...')
                if 'source' in result:
                    print(f'      Fuente: {result[\"source\"][:50]}')
except Exception as e:
    print(f'   Error procesando respuesta: {e}')
    print('   Respuesta raw:', sys.stdin.read())
" 2>/dev/null || echo "$RESPONSE" | grep -o '"text"[[:space:]]*:[[:space:]]*\[[^]]*\]' | sed 's/.*\["\(.*\)"\].*/   \1/'
    
    echo ""
    echo "---"
    echo ""
}

# Realizar pruebas
echo "=== INICIANDO PRUEBAS ==="
echo ""

# Prueba 1: Saludo
send_message "Hola"

# Prueba 2: Pregunta sobre iniciativas
send_message "¿Cuáles son las iniciativas en progreso?"

# Prueba 3: Pregunta específica sobre una iniciativa
send_message "Cuéntame sobre la Transformación Digital 2024"

# Prueba 4: Pregunta sobre presupuestos
send_message "¿Cuál es el presupuesto total de las iniciativas?"

# Prueba 5: Pregunta sobre responsables
send_message "¿Quién es responsable del Programa de Sostenibilidad?"

echo "=== PRUEBAS COMPLETADAS ==="
echo ""
echo "Nota: Si las respuestas no incluyen información de BigQuery, verifica:"
echo "1. Que la indexación en Vertex AI Search esté completa"
echo "2. Que el Data Store esté correctamente vinculado"
echo "3. Los logs en Cloud Console > Dialogflow CX > History"