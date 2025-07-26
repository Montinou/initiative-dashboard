import functions_framework
from flask import jsonify
import requests
import json
import os
from google.cloud import secretmanager

# Initialize Secret Manager client
secret_client = secretmanager.SecretManagerServiceClient()

def get_secret(secret_name):
    """Retrieve secret from Google Secret Manager"""
    try:
        # Try multiple ways to get project ID - no hardcoded fallback
        project_id = (
            os.environ.get('GCP_PROJECT') or 
            os.environ.get('GOOGLE_CLOUD_PROJECT') or 
            os.environ.get('PROJECT_ID')
        )
        
        if not project_id:
            raise ValueError("No project ID found in environment variables")
        
        print(f"Using project ID: {project_id} for secret: {secret_name}")
        
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = secret_client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8").strip()
    except Exception as e:
        print(f"Error accessing secret {secret_name}: {e}")
        raise

def extract_initiative_name_from_text(text):
    """Extract initiative name from user text using pattern matching"""
    import re
    
    # Common patterns for initiative queries in Spanish
    patterns = [
        r'iniciativa\s+(?:de\s+)?([^?]+)',
        r'(?:progreso|estado)\s+de\s+(?:la\s+)?([^?]+)',
        r'(?:cómo\s+va)\s+(?:la\s+)?([^?]+)',
    ]
    
    text_lower = text.lower().strip()
    
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            initiative_name = match.group(1).strip()
            # Clean up common words
            initiative_name = re.sub(r'^(?:la\s+)?iniciativa\s+(?:de\s+)?', '', initiative_name)
            return initiative_name.title()  # Capitalize properly
    
    return None

def extract_area_name_from_text(text):
    """Extract area name from user text using pattern matching"""
    import re
    
    # Common patterns for area queries in Spanish
    patterns = [
        r'área\s+(?:de\s+)?([^?]+)',
        r'división\s+(?:de\s+)?([^?]+)',
        r'departamento\s+(?:de\s+)?([^?]+)',
        r'(?:kpis?\s+del?\s+área\s+(?:de\s+)?)([^?]+)',
    ]
    
    text_lower = text.lower().strip()
    
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            area_name = match.group(1).strip()
            # Clean up common words
            area_name = re.sub(r'^(?:la\s+|el\s+)?(?:área|división|departamento)\s+(?:de\s+)?', '', area_name)
            return area_name.title()  # Capitalize properly
    
    return None

def get_platform_base_url():
    """Get platform base URL from environment or secret manager"""
    try:
        # Try to get from environment first
        base_url = os.environ.get('STRATIX_PLATFORM_URL')
        if base_url:
            return base_url
        
        # Try to get from secret manager
        return get_secret('stratix-platform-url')
    except:
        # TODO: Remove this when platform URL is properly configured
        raise ValueError("Platform URL not configured - add STRATIX_PLATFORM_URL environment variable or secret")

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    Main function that receives calls from Dialogflow CX (both webhook and tool).
    Acts as a backend-for-frontend intermediary between Dialogflow and Supabase.
    """
    try:
        # 1. Extract information from request
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return jsonify({
                "fulfillmentResponse": {
                    "messages": [
                        {
                            "text": {
                                "text": ["Error: No se recibieron datos"]
                            }
                        }
                    ]
                }
            }), 400
        
        print(f"Full request: {json.dumps(request_json, indent=2)}")
        
        # Check if this is a Dialogflow webhook call or tool call
        if 'fulfillmentInfo' in request_json:
            # This is a Dialogflow webhook call
            tag = request_json.get('fulfillmentInfo', {}).get('tag', '')
            session_info = request_json.get('sessionInfo', {})
            params = session_info.get('parameters', {})
            
            print(f"Webhook called with tag: {tag}")
            print(f"Parameters: {params}")
            
            # Map tag to action - no hardcoded values
            print(f"Received tag: '{tag}'")
            if tag == 'company_overview':
                action = 'get_company_overview'
                supabase_params = {}
                print("Mapped to company_overview")
            elif tag == 'initiative_status':
                action = 'get_initiative_status'
                # Extract initiative name from user's original text
                user_text = request_json.get('text', '')
                nombre_iniciativa = extract_initiative_name_from_text(user_text)
                supabase_params = {'nombre_iniciativa': nombre_iniciativa} if nombre_iniciativa else {}
                print(f"Mapped to initiative_status with extracted name: {nombre_iniciativa}")
            elif tag == 'area_kpis':
                action = 'get_area_kpis'
                # Extract area name from user's original text
                user_text = request_json.get('text', '')
                nombre_area = extract_area_name_from_text(user_text)
                supabase_params = {'nombre_area': nombre_area} if nombre_area else {}
                print(f"Mapped to area_kpis with extracted name: {nombre_area}")
            else:
                # No fallbacks - throw error for unsupported tags
                raise ValueError(f"Unsupported tag: {tag}")
            
            print(f"Final action decided: {action}")
            print(f"Final supabase_params: {supabase_params}")
                
        else:
            # This is a tool call (original format) - no fallbacks, strict parameter validation
            tool_name_full = request_json.get('tool', '')
            tool_name = tool_name_full.split('/')[-1] if tool_name_full else 'unknown'
            params = request_json.get('tool_parameters', {})
            
            print(f"Tool called: {tool_name}")
            print(f"Parameters received: {params}")
            
            # Map parameters to Supabase actions - no default fallbacks
            if 'nombre_iniciativa' in params or 'initiative_id' in params:
                action = 'get_initiative_status'
                supabase_params = {
                    'nombre_iniciativa': params.get('nombre_iniciativa'),
                    'initiative_id': params.get('initiative_id')
                }
            elif 'nombre_area' in params or 'area_id' in params:
                action = 'get_area_kpis'
                supabase_params = {
                    'nombre_area': params.get('nombre_area'),
                    'area_id': params.get('area_id')
                }
            elif 'user_id' in params:
                action = 'get_user_initiatives'
                supabase_params = {
                    'user_id': params.get('user_id'),
                    'limit': params.get('limit', 10)
                }
            elif 'query' in params:
                action = 'search_initiatives'
                supabase_params = {
                    'query': params.get('query'),
                    'limit': params.get('limit', 20)
                }
            elif params.get('action') == 'company_overview':
                action = 'get_company_overview'
                supabase_params = {}
            elif params.get('action') == 'suggestions':
                action = 'get_initiative_suggestions'
                supabase_params = {
                    'area_id': params.get('area_id'),
                    'user_role': params.get('user_role')
                }
            else:
                # No fallbacks - require explicit action
                raise ValueError(f"No valid action found for tool parameters: {params}")

        # 2. Get Supabase credentials from Secret Manager
        supabase_url = get_secret('supabase-edge-function-url')
        supabase_key = get_secret('supabase-anon-key')
        
        if not supabase_url or not supabase_key:
            return jsonify({
                "tool_output": [{
                    "tool": tool_name_full,
                    "output": {"error": "Unable to retrieve Supabase credentials"}
                }]
            }), 500

        # 3. Determine action based on parameters and route to Supabase
        output_data = {}
        
        # Map parameters to Supabase actions
        if 'nombre_iniciativa' in params or 'initiative_id' in params:
            action = 'get_initiative_status'
            supabase_params = {
                'nombre_iniciativa': params.get('nombre_iniciativa'),
                'initiative_id': params.get('initiative_id')
            }
        elif 'nombre_area' in params or 'area_id' in params:
            action = 'get_area_kpis'
            supabase_params = {
                'nombre_area': params.get('nombre_area'),
                'area_id': params.get('area_id')
            }
        elif 'user_id' in params:
            action = 'get_user_initiatives'
            supabase_params = {
                'user_id': params.get('user_id'),
                'limit': params.get('limit', 10)
            }
        elif 'query' in params:
            action = 'search_initiatives'
            supabase_params = {
                'query': params.get('query'),
                'limit': params.get('limit', 20)
            }
        elif params.get('action') == 'company_overview':
            action = 'get_company_overview'
            supabase_params = {}
        elif params.get('action') == 'suggestions':
            action = 'get_initiative_suggestions'
            supabase_params = {
                'area_id': params.get('area_id'),
                'user_role': params.get('user_role')
            }
        else:
            # Default to company overview if no specific parameters
            action = 'get_company_overview'
            supabase_params = {}

        # 4. Call Supabase Edge Function
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {supabase_key}',
            'apikey': supabase_key
        }
        
        payload = {
            'action': action,
            'params': supabase_params
        }
        
        # Add user token if provided in params
        if 'user_token' in params:
            payload['user_token'] = params['user_token']
        
        print(f"Calling Supabase with action: {action}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            supabase_url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                output_data = result.get('data', {})
                
                # Enhance the response with contextual information - no hardcoded URLs
                try:
                    platform_url = get_platform_base_url()
                    
                    if action == 'get_initiative_status' and output_data:
                        if platform_url and output_data.get('id'):
                            output_data['link'] = f"{platform_url}/initiatives/{output_data.get('id')}"
                        output_data['resumen'] = f"La iniciativa '{output_data.get('title', '')}' tiene un progreso del {output_data.get('progress', 0)}% y está en estado '{output_data.get('status', '')}'."
                        
                    elif action == 'get_area_kpis' and output_data:
                        if platform_url and output_data.get('area_id'):
                            output_data['link'] = f"{platform_url}/areas/{output_data.get('area_id')}"
                        output_data['resumen'] = f"El área '{output_data.get('area_name', '')}' tiene {output_data.get('total_initiatives', 0)} iniciativas con un progreso promedio del {output_data.get('avg_progress', 0)}%."
                        
                    elif action == 'get_company_overview' and output_data:
                        metrics = output_data.get('company_metrics', {})
                        output_data['resumen'] = f"La empresa tiene {metrics.get('total_initiatives', 0)} iniciativas, {metrics.get('completed_initiatives', 0)} completadas y un progreso general del {metrics.get('overall_progress', 0)}%."
                        if platform_url:
                            output_data['link'] = f"{platform_url}/dashboard"
                            
                except ValueError as url_error:
                    print(f"Platform URL not configured: {url_error}")
                    # Continue without links - no fallback URLs
                    
            else:
                output_data = {"error": result.get('error', 'Unknown error from Supabase')}
        else:
            output_data = {
                "error": f"Supabase request failed: {response.status_code} - {response.text}"
            }

    except requests.exceptions.RequestException as e:
        output_data = {"error": f"Network error calling Supabase: {str(e)}"}
    except Exception as e:
        print(f"Unexpected error: {e}")
        output_data = {"error": f"Internal error: {str(e)}"}

    # 5. Return response based on call type
    if 'fulfillmentInfo' in request_json:
        # Dialogflow webhook response format
        response_text = output_data.get('resumen', 'Datos obtenidos correctamente de Stratix.')
        if 'error' in output_data:
            response_text = f"Lo siento, hubo un error: {output_data['error']}"
        
        return jsonify({
            "fulfillmentResponse": {
                "messages": [
                    {
                        "text": {
                            "text": [response_text]
                        }
                    }
                ]
            }
        })
    else:
        # Tool call response format
        return jsonify({
            "tool_output": [
                {
                    "tool": tool_name_full,
                    "output": output_data
                }
            ]
        })

# Health check endpoint
@functions_framework.http
def health_check(request):
    """Simple health check endpoint"""
    return jsonify({"status": "healthy", "service": "bot-stratix-backend-generative"})