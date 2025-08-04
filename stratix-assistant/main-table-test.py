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
    TABLE TEST: Test different tables to isolate the user_profiles issue
    """
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return jsonify({"error": "No JSON received"}), 400
    
    results = {}

    try:
        # TEST 1: Try tenants table (should be simpler)
        print("TEST 1: Checking tenants table...")
        try:
            tenants_response = supabase.table('tenants').select('id, name').limit(1).execute()
            results["tenants"] = {"status": "success", "data": tenants_response.data}
            print(f"Tenants OK: {tenants_response}")
        except Exception as e:
            results["tenants"] = {"status": "error", "error": str(e)}
            print(f"Tenants ERROR: {e}")
        
        # TEST 2: Try areas table
        print("TEST 2: Checking areas table...")
        try:
            areas_response = supabase.table('areas').select('id, name').limit(1).execute()
            results["areas"] = {"status": "success", "data": areas_response.data}
            print(f"Areas OK: {areas_response}")
        except Exception as e:
            results["areas"] = {"status": "error", "error": str(e)}
            print(f"Areas ERROR: {e}")
        
        # TEST 3: Try initiatives table
        print("TEST 3: Checking initiatives table...")
        try:
            initiatives_response = supabase.table('initiatives').select('id, title').limit(1).execute()
            results["initiatives"] = {"status": "success", "data": initiatives_response.data}
            print(f"Initiatives OK: {initiatives_response}")
        except Exception as e:
            results["initiatives"] = {"status": "error", "error": str(e)}
            print(f"Initiatives ERROR: {e}")
        
        # TEST 4: Only now try user_profiles
        print("TEST 4: Checking user_profiles table...")
        try:
            # Try the simplest possible query first
            profiles_response = supabase.table('user_profiles').select('id').limit(1).execute()
            results["user_profiles"] = {"status": "success", "data": profiles_response.data}
            print(f"User profiles OK: {profiles_response}")
        except Exception as e:
            results["user_profiles"] = {"status": "error", "error": str(e), "type": type(e).__name__}
            print(f"User profiles ERROR: {e}")
        
        return jsonify({
            "tool_output": [{
                "tool": "table-test",
                "output": {
                    "debug": "Table connectivity tests completed",
                    "results": results
                }
            }]
        })

    except Exception as e:
        print(f"GENERAL ERROR: {str(e)}")
        import traceback
        print(f"GENERAL TRACEBACK: {traceback.format_exc()}")
        
        return jsonify({
            "tool_output": [{
                "tool": "table-test", 
                "output": {
                    "error": f"General test failed: {str(e)}",
                    "type": type(e).__name__,
                    "results": results
                }
            }]
        })