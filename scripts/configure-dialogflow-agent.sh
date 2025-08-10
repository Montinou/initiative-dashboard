#!/bin/bash

# Script para configurar completamente el agente de Dialogflow CX

PROJECT_ID="insaight-backend"
LOCATION="us-central1"
AGENT_ID="7f297240-ca50-4896-8b71-e82fd707fa88"
AGENT_NAME="projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"

echo "🔧 Configurando agente de Dialogflow CX..."

# 1. Actualizar configuración del agente
echo "📝 Actualizando configuración del agente..."
cat > /tmp/agent-config.json << 'EOF'
{
  "displayName": "Initiative Assistant with Gemini 2.5",
  "defaultLanguageCode": "es",
  "timeZone": "America/Buenos_Aires",
  "description": "Asistente inteligente para gestión de iniciativas con Gemini 2.5 Flash Lite",
  "enableStackdriverLogging": true,
  "enableSpellCorrection": true,
  "advancedSettings": {
    "loggingSettings": {
      "enableStackdriverLogging": true,
      "enableInteractionLogging": true
    }
  },
  "genAppBuilderSettings": {
    "engine": "projects/insaight-backend/locations/us-central1/collections/default_collection/engines/initiatives-search-store"
  }
}
EOF

curl -X PATCH \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME?updateMask=displayName,description,enableStackdriverLogging,enableSpellCorrection,advancedSettings" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/agent-config.json

echo -e "\n✅ Configuración del agente actualizada"

# 2. Crear o actualizar el playbook
echo -e "\n📚 Configurando playbook generativo..."

# Primero, listar playbooks existentes
echo "Buscando playbooks existentes..."
PLAYBOOKS=$(curl -s -X GET \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/playbooks" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "x-goog-user-project: $PROJECT_ID")

echo "$PLAYBOOKS" | jq '.'

# Crear el playbook
cat > /tmp/playbook.json << 'EOF'
{
  "displayName": "Gestión Inteligente de Iniciativas",
  "goal": "Ayudar a los usuarios a gestionar iniciativas de manera inteligente: consultar información, analizar patrones, sugerir nuevas iniciativas basadas en datos históricos, y crear iniciativas automáticamente con parámetros optimizados.",
  "instructions": [
    {
      "text": "Cuando el usuario pregunte sobre el estado actual, usa los datos disponibles para dar una respuesta precisa y actualizada."
    },
    {
      "text": "Para crear una nueva iniciativa: 1) Analiza contexto histórico de iniciativas similares, 2) Verifica la capacidad del equipo/área, 3) Asegura alineación con objetivos, 4) Estima recursos basado en proyectos similares."
    },
    {
      "text": "Para sugerir iniciativas: Identifica áreas con bajo progreso, busca patrones en iniciativas exitosas (>80% completadas), considera estacionalidad, analiza gaps entre objetivos e iniciativas actuales."
    },
    {
      "text": "Al crear una iniciativa: Genera título descriptivo, crea descripción con contexto/objetivos/métricas/riesgos, asigna fechas realistas basadas en duración promedio y carga actual, sugiere actividades iniciales, recomienda área y responsable apropiado."
    }
  ],
  "examples": [
    {
      "displayName": "Mejorar ventas",
      "query": {
        "text": "Necesito mejorar las ventas del próximo trimestre"
      },
      "output": {
        "text": "Analizando los datos:\n- Las iniciativas de marketing digital han tenido 85% de éxito\n- El área de ventas tiene capacidad para 2 iniciativas más\n- La campaña 'Verano 2024' aumentó ventas en 32%\n\nSugiero crear la iniciativa:\n**Título**: 'Campaña Digital Q2 2025 - Impulso de Ventas'\n**Descripción**: Campaña multicanal enfocada en...\n**Duración estimada**: 8 semanas\n**Actividades sugeridas**:\n1. Análisis de mercado (Semana 1)\n2. Diseño de creatividades (Semana 2-3)\n3. Configuración de campañas (Semana 4)\n\n¿Deseas que cree esta iniciativa?"
      }
    },
    {
      "displayName": "Sugerir iniciativas",
      "query": {
        "text": "¿Qué iniciativas deberíamos lanzar este mes?"
      },
      "output": {
        "text": "Basándome en el análisis:\n\n**Oportunidades identificadas:**\n1. **Gap en Objetivo 'Satisfacción Cliente'**: Progreso 45%\n   → Sugiero: 'Programa de Mejora de Experiencia al Cliente'\n\n2. **Área de Producción sin iniciativas activas**\n   → Sugiero: 'Optimización de Línea de Producción Fase 2'\n\n3. **Tendencia histórica**: En febrero siempre lanzan campañas\n   → Sugiero: 'Campaña San Valentín 2025'\n\n¿Cuál te gustaría explorar primero?"
      }
    }
  ]
}
EOF

# Crear el playbook
echo -e "\nCreando playbook..."
PLAYBOOK_RESPONSE=$(curl -s -X POST \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/playbooks" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/playbook.json)

echo "$PLAYBOOK_RESPONSE" | jq '.'

# 3. Configurar el flujo de inicio con generative fallback
echo -e "\n🔄 Configurando flujo de inicio con generative fallback..."

# Obtener el flujo de inicio
START_FLOW="$AGENT_NAME/flows/00000000-0000-0000-0000-000000000000"

cat > /tmp/flow-config.json << 'EOF'
{
  "displayName": "Default Start Flow",
  "description": "Flujo principal con capacidades generativas",
  "nluSettings": {
    "modelType": "MODEL_TYPE_GENERATIVE",
    "modelTrainingMode": "MODEL_TRAINING_MODE_AUTOMATIC",
    "classificationThreshold": 0.3
  }
}
EOF

curl -X PATCH \
  "https://us-central1-dialogflow.googleapis.com/v3/$START_FLOW?updateMask=nluSettings" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/flow-config.json

echo -e "\n✅ Flujo configurado"

# 4. Configurar generative settings
echo -e "\n🤖 Configurando modelo generativo..."

cat > /tmp/generative-settings.json << 'EOF'
{
  "generativeSettings": {
    "fallbackSettings": {
      "selectedPrompt": {
        "promptText": "Eres un asistente inteligente para la gestión de iniciativas empresariales.\n\nTu conocimiento incluye:\n- Gestión de proyectos y OKRs\n- Análisis de datos y tendencias\n- Mejores prácticas empresariales\n- Metodologías ágiles\n\nCuando respondas:\n1. Sé conciso pero completo\n2. Proporciona datos específicos cuando estén disponibles\n3. Sugiere acciones concretas\n4. Mantén un tono profesional y amigable\n\nSi no entiendes la pregunta o necesitas más información, pide aclaraciones de manera educada.\n\nContexto del sistema:\n- Plataforma de gestión de iniciativas\n- Multi-tenant (SIGA, FEMA, Stratix)\n- Usuarios con roles: CEO, Admin, Manager"
      }
    },
    "languageCode": "es",
    "generativeSafetySettings": {
      "bannedPhraseSettings": {
        "bannedPhrases": []
      }
    },
    "modelParameter": {
      "temperature": 0.7,
      "topK": 40,
      "topP": 0.95,
      "maxDecodeSteps": 2048
    },
    "llmModelSettings": {
      "model": "models/gemini-2.0-flash-001",
      "promptText": "Eres un asistente experto en gestión de iniciativas empresariales."
    }
  }
}
EOF

curl -X PATCH \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME?updateMask=generativeSettings" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/generative-settings.json

echo -e "\n✅ Modelo generativo configurado"

# 5. Crear intents básicos
echo -e "\n🎯 Creando intents básicos..."

# Intent para consultar iniciativas
cat > /tmp/intent-consultar.json << 'EOF'
{
  "displayName": "consultar.iniciativas",
  "trainingPhrases": [
    {
      "parts": [{"text": "¿Cuál es el estado de las iniciativas?"}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "Muéstrame las iniciativas activas"}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "¿Qué iniciativas tenemos?"}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "Lista de iniciativas"}],
      "repeatCount": 1
    }
  ],
  "priority": 500000
}
EOF

curl -X POST \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/intents" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/intent-consultar.json

# Intent para crear iniciativas
cat > /tmp/intent-crear.json << 'EOF'
{
  "displayName": "crear.iniciativa",
  "trainingPhrases": [
    {
      "parts": [{"text": "Necesito crear una nueva iniciativa"}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "Quiero agregar una iniciativa"}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "Crear iniciativa para "}],
      "repeatCount": 1
    },
    {
      "parts": [{"text": "Nueva iniciativa"}],
      "repeatCount": 1
    }
  ],
  "priority": 500000
}
EOF

curl -X POST \
  "https://us-central1-dialogflow.googleapis.com/v3/$AGENT_NAME/intents" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -d @/tmp/intent-crear.json

echo -e "\n✅ Intents creados"

# 6. Limpiar archivos temporales
rm -f /tmp/agent-config.json /tmp/playbook.json /tmp/flow-config.json /tmp/generative-settings.json /tmp/intent-*.json

echo -e "\n🎉 ¡Configuración completada exitosamente!"
echo "Tu agente de Dialogflow CX está listo para usar."
echo ""
echo "📝 Próximos pasos:"
echo "1. Ve a la consola de Dialogflow CX"
echo "2. Abre el agente 'Initiative Assistant with Gemini 2.5'"
echo "3. Prueba el agente en el simulador"
echo "4. Si necesitas webhooks, configúralos en el flujo"
echo ""
echo "🔗 URL del agente:"
echo "https://dialogflow.cloud.google.com/v1/cx/projects/$PROJECT_ID/locations/$LOCATION/agents/$AGENT_ID"