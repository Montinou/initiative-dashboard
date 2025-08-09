# Plan de Arquitectura en Google Cloud (sin integrar en la app por ahora)

Título del Proyecto: Creación de un Asistente IA para la Generación, Seguimiento y Análisis de Planes de Acción y Cumplimiento

Estado y Alcance actual
- No implementaremos nada dentro del código de `initiative-dashboard` por el momento.
- Objetivo: provisionar toda la arquitectura necesaria en Google Cloud usando la CLI (`gcloud`/`bq`).
- Entregables: recursos en GCP listos (BigQuery, Vertex AI Search/Discovery Engine, Dialogflow CX), comandos reproducibles, y validaciones.
- Integración con el frontend (Vercel/Next.js) quedará para una fase posterior.

Variables y convenciones
- PROJECT_ID: id de proyecto en Google Cloud. Por defecto usamos `insaight-backend` (cámbialo si corresponde).
- LOCATION (Vertex AI Search/Dialogflow): `global` (ajusta si tu organización requiere región específica).
- BQ_LOCATION: `US`.
- DATASET_ID: `gestion_iniciativas`
- TABLE_ID: `iniciativas`

APIs requeridas
```bash
PROJECT_ID="insaight-backend" # o el que corresponda

gcloud services enable \
  bigquery.googleapis.com \
  discoveryengine.googleapis.com \
  aiplatform.googleapis.com \
  dialogflow.googleapis.com \
  dialogflow.googleapis.com \
  cloudresourcemanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  --project="$PROJECT_ID"
```

1. Visión General y Objetivo

Objetivo: Desarrollar (por etapas) un asistente conversacional avanzado que actúe como copiloto para la gestión de iniciativas. En esta fase, solo crearemos la base técnica en GCP para:
- Generar planes de acción (futuro)
- Analizar planes actuales e históricos (futuro)
- Predecir probabilidad de cumplimiento (futuro)

Arquitectura (fase actual = aprovisionamiento):
- Frontend (Vercel): sin cambios ahora; integrará más adelante.
- Backend (Google Cloud, aprovisionado con gcloud/bq):
  - BigQuery: base de datos de iniciativas y planes de acción.
  - Vertex AI Search (Discovery Engine): índice semántico sobre BigQuery para grounding.
  - Dialogflow CX: orquestación conversacional y conexión al Data Store de Search.

2. Fases y Tareas del Proyecto (Infra en GCP)

Fase 1: Estructuración del Knowledge Base en BigQuery

Tarea 1.1: Definición del Esquema de Datos
- Tabla principal: `iniciativas` con el siguiente esquema.

Esquema Propuesto para la Tabla iniciativas:
- iniciativa_id (STRING)
- nombre_iniciativa (STRING)
- descripcion (STRING)
- area_responsable (STRING)
- responsable_directo (STRING)
- fecha_inicio (DATE)
- fecha_fin_estimada (DATE)
- fecha_fin_real (DATE)
- estado (STRING, ej: 'No Iniciado', 'En Progreso', 'Completado', 'Retrasado', 'Cancelado')
- progreso_actual (INTEGER, 0-100)
- presupuesto_asignado (FLOAT)
- costo_real (FLOAT)
- resumen_resultados (STRING)
- lecciones_aprendidas (STRING)

Tarea 1.2: Creación de Recursos y Carga de Datos (CLI)
```bash
PROJECT_ID="insaight-backend" # o el que corresponda
DATASET_ID="gestion_iniciativas"
TABLE_ID="iniciativas"
BQ_LOCATION="US"

# Crear el dataset
bq --location=$BQ_LOCATION mk --dataset $PROJECT_ID:$DATASET_ID

# Crear la tabla con el esquema
bq mk --table $PROJECT_ID:$DATASET_ID.$TABLE_ID \
  iniciativa_id:STRING,nombre_iniciativa:STRING,descripcion:STRING,area_responsable:STRING,responsable_directo:STRING,fecha_inicio:DATE,fecha_fin_estimada:DATE,fecha_fin_real:DATE,estado:STRING,progreso_actual:INTEGER,presupuesto_asignado:FLOAT,costo_real:FLOAT,resumen_resultados:STRING,lecciones_aprendidas:STRING

# (Opcional) Cargar datos desde un CSV
bq load --source_format=CSV --skip_leading_rows=1 \
  $PROJECT_ID:$DATASET_ID.$TABLE_ID \
  ./historial_iniciativas.csv
```

Fase 2: Integración con Vertex AI Search (Discovery Engine)

Tarea 2.1: Habilitar APIs y Crear Data Store
```bash
PROJECT_ID="insaight-backend" # o el que corresponda
LOCATION="global"
DATASET_ID="gestion_iniciativas"
TABLE_ID="iniciativas"

gcloud services enable discoveryengine.googleapis.com --project=$PROJECT_ID

# Crear el Data Store (comando alpha puede cambiar; valida tu versión de gcloud)
gcloud alpha vertex-ai data-stores create \
  --project=$PROJECT_ID \
  --location="$LOCATION" \
  --display-name="iniciativas-knowledge-base" \
  --data-source-type="bigquery-source" \
  --bq-project-id=$PROJECT_ID \
  --bq-dataset-id=$DATASET_ID \
  --bq-table-id=$TABLE_ID
```

Verificación en consola
- Vertex AI Search (Discovery Engine) → Data Stores → verifica que la primera indexación finalizó y documentos visibles.

Fase 3: Configuración del Agente en Dialogflow CX

Tarea 3.1: Crear el Agente (CLI)
```bash
PROJECT_ID="insaight-backend" # o el que corresponda
LOCATION="global"

gcloud dialogflow cx agents create \
  --project=$PROJECT_ID \
  --location="$LOCATION" \
  --display-name="asistente-de-iniciativas" \
  --time-zone="America/Argentina/Cordoba" \
  --default-language-code="es"
```

Tarea 3.2: Vincular el Data Store (Paso manual en UI)
- En Dialogflow CX, dentro del agente → "Data Stores".
- Agrega el Data Store `iniciativas-knowledge-base` (de Vertex AI Search/Discovery Engine).
- Activa "Enable Generative Fallback". Esto permite respuestas generativas fundamentadas cuando no hay intención específica.

Tarea 3.3: Intenciones iniciales (solo definición, sin integrar al frontend aún)
- Ejemplo: intención `generar.plan`.
- Frases de entrenamiento: "Crea un plan…", "Genera un plan de acción…".
- Parámetros: `area`, `tema`.
- Fulfillment: iniciar flujo para recolectar detalles (definición en Dialogflow), sin conexión a la app todavía.

3. Validaciones y Entregables de esta fase
- BigQuery: dataset/tabla creados, con datos de ejemplo opcionales.
- Discovery Engine: Data Store creado y primera indexación completa.
- Dialogflow CX: agente creado, Data Store vinculado, Generative Fallback activado.
- Documentar IDs generados, recursos y comandos utilizados.

4. Próxima fase (no incluida ahora)
- Integración del frontend `initiative-dashboard` con el agente/endpoint.
- Seguridad (tokens, Identity-Aware Proxy o backend proxy), y UX de chat.

