Backend para Asistente Stratix
Overview
Este documento detalla el proceso completo para configurar y desplegar la infraestructura de backend necesaria para el asistente de IA de la plataforma Stratix. La arquitectura se compone de tres piezas clave:

Supabase Edge Function: Actúa como un endpoint seguro y directo a la base de datos, aplicando Row Level Security (RLS) para el aislamiento de datos multi-tenant.

Google Cloud Function: Sirve como un intermediario (backend for frontend) que maneja la lógica de negocio, se comunica con Supabase y llama a los modelos de IA de Vertex AI.

Dialogflow CX Agent: Es la interfaz conversacional que interactúa con el usuario y utiliza la Cloud Function como su "herramienta" para realizar acciones.

Prerrequisitos
Antes de comenzar, asegurate de tener instalado y configurado lo siguiente:

Supabase CLI: Instrucciones de instalación

Google Cloud SDK (gcloud): Instrucciones de instalación

Node.js y Deno: Necesarios para el entorno de Supabase.

Python: Para el desarrollo de la Cloud Function.

Cuentas activas: Un proyecto en Supabase y un proyecto en Google Cloud con facturación habilitada.

Parte 1: Configuración de Supabase (La Cocina)
En esta sección, desplegaremos la Edge Function que se conectará de forma segura a tu base de datos.

1. Iniciar Sesión y Vincular Proyecto
Abre tu terminal en la raíz de tu proyecto de Next.js.

# Iniciar sesión en tu cuenta de Supabase
supabase login

# Vincular tu directorio local con tu proyecto remoto de Supabase
# Se te pedirá tu Project Ref ID, que encontrás en el dashboard de Supabase
supabase link --project-ref TU_PROJECT_ID

2. Crear la Edge Function
Este comando crea la estructura de directorios y el archivo inicial para tu función.

# Crear una nueva función llamada 'stratix-handler'
supabase functions new stratix-handler

Esto creará un archivo en supabase/functions/stratix-handler/index.ts.

3. Implementar el Código
Abre el archivo supabase/functions/stratix-handler/index.ts y reemplaza todo su contenido con el código que ya tenemos. Este código está diseñado para manejar las acciones y aplicar RLS automáticamente.

(Usa el código del artifact supabase_edge_function_stratix que ya creamos).

4. Desplegar la Función en Supabase
Con el código ya implementado, desplegá la función en tu proyecto de Supabase.

# Desplegar la función asegurándote de que no se verifique el JWT
# Esto es porque la verificación la haremos nosotros con el token del usuario
supabase functions deploy stratix-handler --no-verify-jwt

5. Obtener Credenciales
Una vez desplegada, necesitás dos cosas de tu dashboard de Supabase para el siguiente paso:

La URL de la Función: En el dashboard de Supabase, andá a Edge Functions, seleccioná stratix-handler y copiá la URL.

La Clave anon key: En el dashboard, andá a Project Settings > API y copiá la clave pública (anon key). Nunca uses la service_role key para esto.

Guarda estos dos valores. Los necesitaremos para la Cloud Function.

Parte 2: Configuración de Google Cloud (El Delivery)
Ahora desplegaremos la Cloud Function en Python que actuará como intermediario.

1. Iniciar Sesión y Configurar Proyecto
Abre tu terminal.

# Iniciar sesión en tu cuenta de Google
gcloud auth login

# Establecer el proyecto de Google Cloud con el que vas a trabajar
gcloud config set project TU_GOOGLE_CLOUD_PROJECT_ID

2. Preparar los Archivos de la Función
En tu máquina local, crea un nuevo directorio para la función, por ejemplo gcloud-function. Dentro de ese directorio, crea dos archivos:

main.py:
Pega aquí el código Python que ya tenemos para el agente generativo.

(Usa el código del artifact bot_stratix_backend_generative que ya creamos).

requirements.txt:
Este archivo le dice a Google qué librerías de Python instalar.

functions-framework
flask
requests # Necesaria para llamar a la Supabase Edge Function
# supabase # Si decidieras conectar directamente, pero no es lo recomendado

3. Manejo de Secretos (¡Importante!)
No pongas la URL y la clave de Supabase directamente en el código. Usa Secret Manager de Google Cloud.

# Crear un secreto para la URL de la Edge Function
echo "URL_DE_TU_EDGE_FUNCTION" | gcloud secrets create supabase-edge-function-url --data-file=-

# Crear un secreto para la clave anónima de Supabase
echo "TU_SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=-

Tendrás que modificar el código de Python para que lea estos secretos en lugar de tenerlos hardcodeados.

4. Desplegar la Cloud Function
Navegá hasta el directorio gcloud-function en tu terminal y ejecutá el siguiente comando para desplegar:

gcloud functions deploy bot-stratix-backend-generative \
--gen2 \
--runtime=python311 \
--region=us-central1 \
--source=. \
--entry-point=bot_stratix_backend_generative \
--trigger-http \
--allow-unauthenticated \
--set-secrets=SUPABASE_URL=supabase-edge-function-url:latest,SUPABASE_KEY=supabase-anon-key:latest

--gen2: Usa la 2da generación de Cloud Functions, más moderna.

--runtime: Especifica la versión de Python.

--entry-point: El nombre de la función en tu archivo main.py.

--trigger-http: Hace que la función sea accesible vía una URL.

--allow-unauthenticated: Importante. Permite que Dialogflow (que es un servicio de Google) pueda llamar a esta función sin necesidad de una autenticación de usuario final. La seguridad la manejamos dentro de la función.

--set-secrets: Monta los secretos que creamos como variables de entorno dentro de la función.

Una vez que termine el despliegue, la terminal te devolverá una URL del activador (Trigger URL). ¡Copiá esa URL!

Parte 3: Configuración de Dialogflow CX (El Mozo)
El último paso es decirle a tu agente de IA que use la Cloud Function que acabamos de desplegar.

Andá a la consola de Dialogflow CX y seleccioná tu agente generativo.

En el menú de la izquierda, andá a la sección de "Tools".

Creá una nueva herramienta y llamala webhook_supabase_stratix.

En el campo URL, pegá la Trigger URL de tu Google Cloud Function.

En la Descripción, sé muy claro para que la IA sepa cuándo usarla. Por ejemplo:

"Usa esta herramienta para obtener datos reales y actualizados de la base de datos de Stratix. Sirve para consultar el estado de iniciativas o los KPIs de un área. Debes proveer los parámetros que el usuario mencione, como 'nombre_iniciativa' o 'nombre_area'."

Define el esquema de entrada y salida para que la IA sepa qué datos mandar y qué esperar de vuelta.

¡Guardá todo y listo!

Conclusión
Con estos pasos, has configurado una arquitectura serverless, segura y escalable. El flujo completo es:

Usuario ↔️ Dialogflow CX ↔️ Google Cloud Function ↔️ Supabase Edge Function ↔️ Base de Datos PostgreSQL

Ahora podés empezar a probar tu agente en el panel de "Test Agent" de Dialogflow y verificar los logs en Google Cloud para depurar cualquier problema.