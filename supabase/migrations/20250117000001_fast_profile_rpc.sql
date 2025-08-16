-- Create fast profile RPC function to avoid RLS overhead on initial load
-- This helps solve the 391ms timeout issue after successful authentication

-- Create the fast profile fetch function
CREATE OR REPLACE FUNCTION public.get_user_profile_fast(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    tenant_id uuid,
    email text,
    full_name text,
    role user_role,
    area_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Direct query without RLS policies for initial load
    -- This function runs with elevated privileges to bypass RLS
    -- but only returns data for the authenticated user
    
    -- Verify the requesting user matches the requested profile
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: can only fetch own profile';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.id,
        up.tenant_id,
        up.email,
        up.full_name,
        up.role,
        up.area_id
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid
    LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_profile_fast(uuid) TO authenticated;

-- Create additional helper function for session validation
CREATE OR REPLACE FUNCTION public.validate_user_session()
RETURNS TABLE (
    user_id uuid,
    tenant_id uuid,
    role user_role,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Quick session validation without complex RLS
    RETURN QUERY
    SELECT 
        up.user_id,
        up.tenant_id,
        up.role,
        up.is_active
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.is_active = true
    LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_user_session() TO authenticated;

-- Create function to warm up get_current_user_tenant cache
CREATE OR REPLACE FUNCTION public.warm_tenant_cache()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE -- Intentionally volatile to always execute
AS $$
DECLARE
    tenant_uuid uuid;
BEGIN
    -- Pre-warm the tenant lookup cache
    SELECT tenant_id INTO tenant_uuid
    FROM public.user_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Also call the main function to cache its result
    SELECT public.get_current_user_tenant() INTO tenant_uuid;
    
    RETURN tenant_uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.warm_tenant_cache() TO authenticated;

-- Verify functions were created successfully
DO $$
BEGIN
    -- Check if all functions exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_profile_fast') THEN
        RAISE EXCEPTION 'Function get_user_profile_fast was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_user_session') THEN
        RAISE EXCEPTION 'Function validate_user_session was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'warm_tenant_cache') THEN
        RAISE EXCEPTION 'Function warm_tenant_cache was not created';
    END IF;
    
    RAISE NOTICE 'Fast profile RPC functions created successfully';
END $$;
