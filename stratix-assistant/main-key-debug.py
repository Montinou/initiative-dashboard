import functions_framework
from flask import jsonify
import os
import json
from supabase import create_client, Client

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    KEY DEBUG: Test the actual key values and formats
    """
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return jsonify({"error": "No JSON received"}), 400
    
    # Get environment variables
    supabase_url = os.environ.get('SUPABASE_URL', '').strip()
    supabase_key = os.environ.get('SUPABASE_KEY', '').strip()
    supabase_service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
    
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_KEY first 20 chars: {supabase_key[:20]}...")
    print(f"SUPABASE_SERVICE_ROLE_KEY first 20 chars: {supabase_service_key[:20]}...")
    
    # Validate key formats
    service_key_valid = supabase_service_key.startswith('eyJ') and supabase_service_key.count('.') == 2
    regular_key_valid = supabase_key.startswith('eyJ') and supabase_key.count('.') == 2
    
    results = {
        "url": supabase_url,
        "service_key_format": "valid" if service_key_valid else "invalid",
        "regular_key_format": "valid" if regular_key_valid else "invalid",
        "service_key_length": len(supabase_service_key),
        "regular_key_length": len(supabase_key)
    }
    
    # Try to make a simple connection test
    try:
        if supabase_service_key and service_key_valid:
            print("Testing with service role key...")
            supabase = create_client(supabase_url, supabase_service_key)
            # Try to query a simple table - the simplest query possible
            test_response = supabase.table('user_profiles').select('id').limit(1).execute()
            results["connection"] = "success"
            results["test_data"] = test_response.data if hasattr(test_response, 'data') else "no data"
        else:
            results["connection"] = "service_key_invalid_or_missing"
    except Exception as e:
        results["connection"] = f"failed: {str(e)}"
        print(f"Connection test failed: {e}")
    
    return jsonify({
        "tool_output": [{
            "tool": "key-debug",
            "output": results
        }]
    })