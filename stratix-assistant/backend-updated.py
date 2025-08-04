import functions_framework
from flask import jsonify
import os
import json
from supabase import create_client, Client

# Configuración de Supabase desde variables de entorno
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    Función principal que recibe las llamadas de la "Tool" de un Agente Generativo de Dialogflow.
    Ahora usa datos reales de Supabase en lugar de respuestas hardcodeadas.
    """
    # 1. Extraer la información que manda el agente Generativo
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return jsonify({
            "tool_output": [
                {
                    "tool": "",
                    "output": {
                        "error": "No se recibió un JSON válido en la solicitud."
                    }
                }
            ]
        }), 400
    
    # En el modelo generativo, no usamos 'tag', usamos el nombre de la herramienta.
    tool_name_full = request_json.get('tool', '')
    tool_name = tool_name_full.split('/')[-1] if tool_name_full else ''

    # Los parámetros también vienen en una estructura un poco diferente
    params = request_json.get('tool_parameters', {})
    user_id = params.get('user_id', '')
    
    print(f"Herramienta llamada: {tool_name}")
    print(f"Parámetros recibidos: {params}")

    # Validar que tenemos un user_id
    if not user_id:
        return jsonify({
            "tool_output": [
                {
                    "tool": tool_name_full,
                    "output": {
                        "error": "Se requiere el parámetro user_id."
                    }
                }
            ]
        }), 400

    output_data = {}

    try:
        # Obtener el tenant_id del usuario
        user_profile_response = supabase.table('user_profiles').select('tenant_id').eq('user_id', user_id).single().execute()
        
        if not user_profile_response.data:
            return jsonify({
                "tool_output": [
                    {
                        "tool": tool_name_full,
                        "output": {
                            "error": f"No se encontró el perfil del usuario {user_id}."
                        }
                    }
                ]
            }), 404
        
        tenant_id = user_profile_response.data['tenant_id']
        
        if 'nombre_iniciativa' in params:
            nombre_iniciativa = params.get('nombre_iniciativa')
            
            # Buscar la iniciativa en Supabase usando el tenant_id
            initiative_response = supabase.table('initiatives').select('*').eq('tenant_id', tenant_id).ilike('title', f'%{nombre_iniciativa}%').execute()
            
            if initiative_response.data and len(initiative_response.data) > 0:
                initiative = initiative_response.data[0]
                progreso = f"{initiative['progress']}%"
                link_detalle = f"https://stratix-platform.vercel.app/initiatives/{initiative['id']}"
                
                # Obtener más detalles de la iniciativa
                area_name = "N/A"
                if initiative['area_id']:
                    area_response = supabase.table('areas').select('name').eq('id', initiative['area_id']).single().execute()
                    if area_response.data:
                        area_name = area_response.data['name']
                
                # Información sobre presupuesto
                budget_info = ""
                if initiative['budget'] and initiative['actual_cost']:
                    budget_efficiency = ((initiative['budget'] - initiative['actual_cost']) / initiative['budget']) * 100
                    budget_info = f" Presupuesto: ${initiative['budget']:,.2f}, gastado: ${initiative['actual_cost']:,.2f} (eficiencia: {budget_efficiency:.1f}%)."
                
                # Preparamos la data de salida que la IA usará para responder
                output_data = {
                    "progreso": progreso,
                    "link": link_detalle,
                    "resumen": f"La iniciativa '{initiative['title']}' en el área {area_name} tiene un progreso del {progreso}. Estado: {initiative['status']}.{budget_info}",
                    "detalles": {
                        "titulo": initiative['title'],
                        "descripcion": initiative['description'],
                        "estado": initiative['status'],
                        "area": area_name,
                        "fecha_objetivo": initiative['target_date'],
                        "prioridad": initiative['priority'],
                        "presupuesto": initiative['budget'],
                        "costo_actual": initiative['actual_cost']
                    }
                }
            else:
                output_data = {
                    "error": f"No se encontró la iniciativa '{nombre_iniciativa}' en la empresa del usuario."
                }

        elif 'nombre_area' in params:
            nombre_area = params.get('nombre_area')
            
            # Buscar el área en Supabase
            area_response = supabase.table('areas').select('*').eq('tenant_id', tenant_id).ilike('name', f'%{nombre_area}%').execute()
            
            if area_response.data and len(area_response.data) > 0:
                area = area_response.data[0]
                
                # Obtener iniciativas del área
                initiatives_response = supabase.table('initiatives').select('*').eq('area_id', area['id']).execute()
                initiatives = initiatives_response.data or []
                
                # Calcular KPIs del área
                total_initiatives = len(initiatives)
                completed_initiatives = len([i for i in initiatives if i['status'] == 'completed'])
                avg_progress = sum([i['progress'] for i in initiatives]) / total_initiatives if total_initiatives > 0 else 0
                
                # Calcular eficiencia presupuestaria
                total_budget = sum([i['budget'] or 0 for i in initiatives])
                total_spent = sum([i['actual_cost'] or 0 for i in initiatives])
                budget_efficiency = ((total_budget - total_spent) / total_budget * 100) if total_budget > 0 else 100
                
                kpi_valor = f"{avg_progress:.1f}%"
                link_grafico = f"https://stratix-platform.vercel.app/areas/{area['id']}"
                
                # Preparamos la data de salida
                output_data = {
                    "kpi_valor": kpi_valor,
                    "link": link_grafico,
                    "resumen": f"El área '{area['name']}' tiene {total_initiatives} iniciativas con un progreso promedio del {kpi_valor}. {completed_initiatives} iniciativas completadas. Eficiencia presupuestaria: {budget_efficiency:.1f}%.",
                    "detalles": {
                        "nombre": area['name'],
                        "descripcion": area['description'],
                        "total_iniciativas": total_initiatives,
                        "iniciativas_completadas": completed_initiatives,
                        "progreso_promedio": avg_progress,
                        "presupuesto_total": total_budget,
                        "gasto_total": total_spent,
                        "eficiencia_presupuestaria": budget_efficiency
                    }
                }
            else:
                output_data = {
                    "error": f"No se encontró el área '{nombre_area}' en la empresa del usuario."
                }
        
        elif 'user_query' in params:
            # Para consultas generales, proporcionar un resumen de la empresa
            user_query = params.get('user_query', '')
            
            # Obtener resumen de todas las iniciativas
            initiatives_response = supabase.table('initiatives_with_subtasks_summary').select('*').eq('tenant_id', tenant_id).execute()
            initiatives = initiatives_response.data or []
            
            # Obtener todas las áreas
            areas_response = supabase.table('areas').select('*').eq('tenant_id', tenant_id).execute()
            areas = areas_response.data or []
            
            # Calcular métricas generales
            total_initiatives = len(initiatives)
            completed_initiatives = len([i for i in initiatives if i['status'] == 'completed'])
            avg_progress = sum([i['initiative_progress'] for i in initiatives]) / total_initiatives if total_initiatives > 0 else 0
            total_budget = sum([i['budget'] or 0 for i in initiatives])
            total_spent = sum([i['actual_cost'] or 0 for i in initiatives])
            
            output_data = {
                "resumen": f"Tu empresa tiene {total_initiatives} iniciativas activas distribuidas en {len(areas)} áreas. Progreso promedio: {avg_progress:.1f}%. {completed_initiatives} iniciativas completadas. Presupuesto total: ${total_budget:,.2f}, gastado: ${total_spent:,.2f}.",
                "query_original": user_query,
                "metricas": {
                    "total_iniciativas": total_initiatives,
                    "iniciativas_completadas": completed_initiatives,
                    "progreso_promedio": avg_progress,
                    "total_areas": len(areas),
                    "presupuesto_total": total_budget,
                    "gasto_total": total_spent
                }
            }
        
        else:
            output_data = {
                "error": "No se recibieron los parámetros esperados (nombre_iniciativa, nombre_area, o user_query)."
            }

    except Exception as e:
        print(f"Error accessing Supabase: {str(e)}")
        output_data = {
            "error": f"Error interno del servidor al acceder a los datos: {str(e)}"
        }

    # 3. Armar la respuesta para devolverle a la IA de Dialogflow
    response = {
        "tool_output": [
            {
                "tool": tool_name_full,
                "output": output_data
            }
        ]
    }
    
    return jsonify(response)