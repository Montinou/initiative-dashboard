import functions_framework
from flask import jsonify
import os
import json

@functions_framework.http
def bot_stratix_backend_generative(request):
    """
    ENV TEST: Check what environment variables are actually available
    """
    request_json = request.get_json(silent=True)
    
    if not request_json:
        return jsonify({"error": "No JSON received"}), 400
    
    # Get environment variables (safely, without exposing full keys)
    supabase_url = os.environ.get('SUPABASE_URL', '').strip()
    supabase_key = os.environ.get('SUPABASE_KEY', '').strip()
    supabase_service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
    
    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_KEY length: {len(supabase_key)} chars")
    print(f"SUPABASE_SERVICE_ROLE_KEY length: {len(supabase_service_key)} chars")
    
    # Check if these look like valid JWT tokens
    supabase_key_valid = supabase_key.startswith('eyJ') and supabase_key.count('.') == 2
    service_key_valid = supabase_service_key.startswith('eyJ') and supabase_service_key.count('.') == 2
    
    # Test a simple connection attempt
    connection_test = "not attempted"
    try:
        from supabase import create_client, Client
        if supabase_service_key:
            print("Attempting connection with service role key...")
            test_client = create_client(supabase_url, supabase_service_key)
            # Try to make a very simple request - just get the Supabase API info
            # This should work even if tables have issues
            connection_test = "service_key_client_created"
        else:
            print("Attempting connection with regular key...")
            test_client = create_client(supabase_url, supabase_key)
            connection_test = "regular_key_client_created"
            
    except Exception as e:
        connection_test = f"failed: {str(e)}"
        print(f"Connection test failed: {e}")
    
    return jsonify({
        "tool_output": [{
            "tool": "env-test",
            "output": {
                "debug": "Environment variable check completed",
                "supabase_url": supabase_url,
                "supabase_key_length": len(supabase_key),
                "supabase_key_format_valid": supabase_key_valid,
                "service_key_length": len(supabase_service_key),
                "service_key_format_valid": service_key_valid,
                "connection_test": connection_test,
                "using_service_key": len(supabase_service_key) > 0
            }
        }]
    })