import functions_framework
from flask import jsonify
import os
import json
from supabase import create_client, Client

# Configuración de Supabase desde variables de entorno
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').strip()
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '').strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

# Use service role key to bypass RLS policies
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()

if SUPABASE_SERVICE_ROLE_KEY:
    print("Using Supabase service role key (bypasses RLS)")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    print("Using regular Supabase key")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    DEBUG VERSION: Minimal test of Supabase connectivity
    """
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return jsonify({"error": "No JSON received"}), 400
    
    params = request_json.get('tool_parameters', {})
    user_id = params.get('user_id', '')
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        # TEST 1: Simple count query (should always work)
        print("TEST 1: Counting user_profiles...")
        count_response = supabase.table('user_profiles').select('id', count='exact').execute()
        print(f"Count result: {count_response}")
        
        # TEST 2: Try to get ANY user profile (not specific one)
        print("TEST 2: Getting any user profile...")
        any_profile_response = supabase.table('user_profiles').select('user_id, tenant_id, role').limit(1).execute()
        print(f"Any profile result: {any_profile_response}")
        
        # TEST 3: Only if the above work, try the specific user
        if any_profile_response.data:
            print(f"TEST 3: Looking for specific user {user_id}...")
            user_profile_response = supabase.table('user_profiles').select('tenant_id, role').eq('user_id', user_id).execute()
            print(f"Specific user result: {user_profile_response}")
        
        return jsonify({
            "tool_output": [{
                "tool": "debug-test",
                "output": {
                    "debug": "Tests completed successfully",
                    "count": count_response.count if hasattr(count_response, 'count') else "unknown",
                    "sample_data": any_profile_response.data if hasattr(any_profile_response, 'data') else "none",
                    "user_specific": "tested" if any_profile_response.data else "skipped"
                }
            }]
        })

    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        import traceback
        print(f"DEBUG TRACEBACK: {traceback.format_exc()}")
        
        return jsonify({
            "tool_output": [{
                "tool": "debug-test", 
                "output": {
                    "error": f"Debug test failed: {str(e)}",
                    "type": type(e).__name__,
                    "details": str(e)
                }
            }]
        })