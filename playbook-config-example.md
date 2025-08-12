# Configuración Completa de Playbook con Tool

## 1. Configuración del Playbook

### Goal
```
Help users access and retrieve initiative dashboard data
```

### Instructions
```
You are an assistant that helps users access initiative and project data.

CRITICAL INSTRUCTIONS:
1. When users ask ANYTHING about initiatives, projects, metrics, or dashboard data, you MUST IMMEDIATELY use the ${TOOL:initiative_data_tool} to retrieve the information.

2. DO NOT make up any data or provide generic responses about initiatives.

3. After calling the tool, format the response in a clear and friendly way.

4. If the tool returns an error, inform the user and ask them to try again.

Examples of when to use the tool:
- "Show me the initiatives"
- "What projects are available?"
- "Get the dashboard data"
- "Access the metrics"
- "Tell me about our initiatives"

Always acknowledge the user's request first, then call the tool.
```

### Examples (Añadir al menos 2-3 ejemplos)
```
User: Show me the current initiatives
Assistant: I'll retrieve the current initiatives data for you.
[Calls tool]
Here are the current initiatives: [formatted data from tool]

User: What's in the dashboard?
Assistant: Let me access the dashboard data for you.
[Calls tool]
The dashboard shows: [formatted data from tool]
```

## 2. Configuración del Tool

### Tool Name
```
initiative_data_tool
```

### Tool Type
```
OpenAPI
```

### Authentication
```
Type: ID Token (si usas Cloud Functions en el mismo proyecto)
```

### OpenAPI Schema
```yaml
openapi: 3.0.0
info:
  title: Initiative Dashboard API
  version: 1.0.0
servers:
  - url: https://us-central1-insaight-backend.cloudfunctions.net
paths:
  /getInitiativeData:
    post:
      summary: Retrieve initiative dashboard data
      operationId: getInitiativeData
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                  description: The user's query about initiatives
                filters:
                  type: object
                  description: Optional filters for the data
                  properties:
                    status:
                      type: string
                    date_range:
                      type: string
              required:
                - query
      responses:
        '200':
          description: Initiative data retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        status:
                          type: string
                        metrics:
                          type: object
                  message:
                    type: string
```

## 3. Cloud Function Implementation

```javascript
// index.js para tu Cloud Function
const functions = require('@google-cloud/functions-framework');

functions.http('getInitiativeData', async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  console.log('Request received:', JSON.stringify(req.body));

  try {
    // Extraer parámetros del request de Dialogflow
    const { query, filters } = req.body;
    
    // Aquí conectas con tu base de datos o API
    // Este es un ejemplo con datos de prueba
    const initiativeData = [
      {
        id: '1',
        name: 'Digital Transformation Initiative',
        status: 'active',
        metrics: {
          completion: 75,
          budget_used: 60
        }
      },
      {
        id: '2',
        name: 'Customer Experience Enhancement',
        status: 'planning',
        metrics: {
          completion: 25,
          budget_used: 15
        }
      }
    ];

    // Formato de respuesta para Dialogflow
    const response = {
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: [
                `Found ${initiativeData.length} initiatives. Here's the data:\n` +
                initiativeData.map(i => 
                  `- ${i.name}: ${i.status} (${i.metrics.completion}% complete)`
                ).join('\n')
              ]
            }
          }
        ]
      },
      sessionInfo: {
        parameters: {
          last_query_result_count: initiativeData.length,
          last_query_status: 'success'
        }
      }
    };

    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error:', error);
    
    res.status(200).json({
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: ['Sorry, I encountered an error retrieving the data. Please try again.']
            }
          }
        ]
      }
    });
  }
});
```

## 4. Deployment Commands

```bash
# Deploy Cloud Function
gcloud functions deploy getInitiativeData \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --project insaight-backend

# Grant permissions for Dialogflow
PROJECT_NUMBER=$(gcloud projects describe insaight-backend --format="value(projectNumber)")
gcloud functions add-iam-policy-binding getInitiativeData \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-dialogflow.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1
```

## 5. Testing en Dialogflow

### Frases de prueba en el Test Agent:
1. "Show me the initiatives"
2. "Get dashboard data"
3. "What initiatives are available?"
4. "Access the project information"

### Qué verificar en el Diagnostics:
- Debe aparecer `toolCall` en la respuesta
- El tool debe mostrar los parámetros enviados
- La respuesta debe incluir los datos del tool

## 6. Troubleshooting

### Si el tool NO se activa:
1. **Instrucciones más explícitas**: Añade más ejemplos y usa CAPS para enfatizar
2. **Simplifica el schema**: Empieza con un schema básico y ve añadiendo complejidad
3. **Verifica el modelo**: Asegúrate de usar gemini-1.5-flash o superior

### Si el tool da error:
1. **Revisa los logs**: Cloud Logging → Busca por session ID
2. **Timeout**: Asegúrate que responde en < 5 segundos
3. **Formato**: La respuesta DEBE seguir el formato exacto de Dialogflow

### Si funciona en Test pero no en producción:
1. **Versión del API**: Usa v3beta si es necesario
2. **Integración**: Algunos canales tienen limitaciones con toolCall
3. **Autenticación**: Verifica permisos del service agent