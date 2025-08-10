# Configuración del Playbook en Dialogflow CX

## 1. Crear el Playbook

1. Ve a la sección **Playbooks** en el menú lateral
2. Haz clic en **"+ Create Playbook"**
3. Copia el contenido del archivo `dialogflow-playbook-correct.yaml`
4. Pégalo en el editor de playbook

## 2. Configurar Generative Fallback

En la configuración del agente (Settings):

### Generative AI Settings:
```
Model: gemini-2.5-flash-lite
Temperature: 0.7
Max Output Tokens: 2048
Top K: 40
Top P: 0.95
```

### Generative Fallback:
1. Habilita **"Enable generative fallback"**
2. En el prompt del fallback, agrega:

```
Eres un asistente inteligente para la gestión de iniciativas empresariales.

Tu conocimiento incluye:
- Gestión de proyectos y OKRs
- Análisis de datos y tendencias
- Mejores prácticas empresariales
- Metodologías ágiles

Cuando respondas:
1. Sé conciso pero completo
2. Proporciona datos específicos cuando estén disponibles
3. Sugiere acciones concretas
4. Mantén un tono profesional y amigable

Si no entiendes la pregunta o necesitas más información, pide aclaraciones de manera educada.

Contexto del sistema:
- Plataforma de gestión de iniciativas
- Multi-tenant (SIGA, FEMA, Stratix)
- Datos almacenados en Supabase y BigQuery
- Usuarios con roles: CEO, Admin, Manager
```

## 3. Configurar Data Stores (Opcional)

Si tienes acceso a Vertex AI Search:

1. Ve a **Tools** → **Data Stores**
2. Conecta tu dataset de BigQuery:
   - Project: `insaight-backend`
   - Dataset: `gestion_iniciativas`
   - Tablas principales:
     - `initiatives`
     - `activities`
     - `objectives`
     - `areas`
     - `user_profiles`

## 4. Webhooks para Acciones

Para habilitar acciones como crear iniciativas:

1. Ve a **Flows** → **Default Start Flow**
2. En las rutas, agrega webhooks para:
   - `create_initiative`
   - `get_initiatives`
   - `update_activity`

URL del webhook:
```
https://us-central1-insaight-backend.cloudfunctions.net/dialogflowWebhook
```

Headers:
```
Content-Type: application/json
Authorization: Bearer ${SECRET_TOKEN}
```

## 5. Probar el Playbook

1. Usa el simulador integrado
2. Prueba estas consultas:
   - "¿Cuál es el estado de las iniciativas?"
   - "Necesito crear una nueva iniciativa"
   - "¿Qué actividades están pendientes?"
   - "Sugiere iniciativas para mejorar ventas"

## Errores Comunes y Soluciones

### "Bad playbook content"
- Asegúrate de usar el formato YAML correcto
- No uses campos no soportados como `tools` o `data_sources`
- Verifica la indentación (2 espacios)

### "Model not available"
- Verifica que `gemini-2.5-flash-lite` esté disponible en tu región
- Alternativa: usa `gemini-1.5-flash` o `gemini-1.5-pro`

### El playbook no responde
- Verifica que el generative fallback esté habilitado
- Asegúrate de que el playbook esté activo
- Revisa los logs en Cloud Logging