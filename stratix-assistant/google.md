import functions_framework
from flask import jsonify

# Aquí importarías las librerías de Supabase
# from supabase import create_client, Client

# --- Configuración de Supabase (esto iría en variables de entorno seguras) ---
# SUPABASE_URL = "TU_URL_DE_SUPABASE"
# SUPABASE_KEY = "TU_CLAVE_DE_SUPABASE"
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# --------------------------------------------------------------------------

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    Función principal que recibe las llamadas de la "Tool" de un Agente Generativo de Dialogflow.
    """
    # 1. Extraer la información que manda el agente Generativo
    request_json = request.get_json(silent=True)
    
    # En el modelo generativo, no usamos 'tag', usamos el nombre de la herramienta.
    # El nombre de la herramienta lo definís en la consola de Dialogflow.
    tool_name_full = request_json.get('tool', '') # El formato es projects/../agents/../tools/TOOL_ID
    tool_name = tool_name_full.split('/')[-1] # Extraemos solo el nombre final

    # Los parámetros también vienen en una estructura un poco diferente
    params = request_json.get('tool_parameters', {})
    
    print(f"Herramienta llamada: {tool_name}")
    print(f"Parámetros recibidos: {params}")

    # 2. Decidir qué hacer según el nombre de la herramienta
    # En este caso, asumimos que tenemos una sola herramienta/webhook para todo.
    # La lógica para diferenciar tareas se puede hacer aquí o creando múltiples herramientas.

    # Vamos a tratar de adivinar la intención del usuario basándonos en los parámetros que nos llegan.
    # Esto es más flexible que usar un tag fijo.
    
    output_data = {} # Aquí guardaremos los resultados para devolverlos

    if 'nombre_iniciativa' in params:
        nombre_iniciativa = params.get('nombre_iniciativa')
        # --- ACÁ LLAMARÍAS A SUPABASE ---
        # Ejemplo: data = supabase.table('initiatives').select('progress, link').eq('name', nombre_iniciativa).single().execute()
        # ---------------------------------
        # Por ahora, simulamos la respuesta:
        progreso = "75%"
        link_detalle = f"https://stratix-platform.vercel.app/initiatives/123?name={nombre_iniciativa}"
        
        # Preparamos la data de salida que la IA usará para responder
        output_data = {
            "progreso": progreso,
            "link": link_detalle,
            "resumen": f"El progreso de la iniciativa '{nombre_iniciativa}' es del {progreso}."
        }

    elif 'nombre_area' in params:
        nombre_area = params.get('nombre_area')
        # --- ACÁ LLAMARÍAS A SUPABASE ---
        # Ejemplo: data = supabase.table('kpis').select('kpi_value, link').eq('area_name', nombre_area).single().execute()
        # ---------------------------------
        # Por ahora, simulamos la respuesta:
        kpi_valor = "92%"
        link_grafico = f"https://stratix-platform.vercel.app/dashboards/456?area={nombre_area}"
        
        # Preparamos la data de salida
        output_data = {
            "kpi_valor": kpi_valor,
            "link": link_grafico,
            "resumen": f"El KPI principal para el área '{nombre_area}' es del {kpi_valor}."
        }
    else:
        output_data = {
            "error": "No se recibieron los parámetros esperados (nombre_iniciativa o nombre_area)."
        }


    # 3. Armar la respuesta para devolverle a la IA de Dialogflow
    # El formato de respuesta de una "Tool" es diferente al de un webhook de flujo.
    response = {
        "tool_output": [
            {
                "tool": tool_name_full, # Devolvemos el nombre completo de la herramienta que nos llamaron
                "output": output_data # Devolvemos un objeto JSON con los resultados
            }
        ]
    }
    
    return jsonify(response)
