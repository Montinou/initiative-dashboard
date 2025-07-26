-- AUTH SYNC TRIGGERS
-- Creates triggers to automatically sync auth.users with public.user_profiles

-- ============================================================================
-- PART 1: CREATE SYNC FUNCTION FOR NEW USERS
-- ============================================================================

-- Function to handle new user creation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_tenant_id UUID;
    user_email TEXT;
BEGIN
    -- Get user email from auth.users
    user_email := NEW.email;
    
    -- Get a default tenant (first active tenant) or create one if none exists
    SELECT id INTO default_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    LIMIT 1;
    
    -- If no active tenant exists, create a default one
    IF default_tenant_id IS NULL THEN
        INSERT INTO public.tenants (name, subdomain, description, industry, is_active)
        VALUES ('Default Organization', 'default', 'Default tenant for new users', 'General', true)
        RETURNING id INTO default_tenant_id;
    END IF;
    
    -- Create user profile in public.user_profiles
    INSERT INTO public.user_profiles (
        id,
        tenant_id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        default_tenant_id,
        user_email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(user_email, '@', 1)),
        'Analyst'::user_role,
        true,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: CREATE SYNC FUNCTION FOR USER UPDATES
-- ============================================================================

-- Function to handle user updates in auth.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update email if it changed in auth.users
    IF OLD.email != NEW.email OR OLD.raw_user_meta_data != NEW.raw_user_meta_data THEN
        UPDATE public.user_profiles 
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: CREATE SYNC FUNCTION FOR USER DELETION
-- ============================================================================

-- Function to handle user deletion in auth.users
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Soft delete: mark user as inactive instead of hard delete
    UPDATE public.user_profiles 
    SET 
        is_active = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.id;
    
    -- Log the deletion in audit log
    INSERT INTO public.audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        created_at
    ) 
    SELECT 
        up.tenant_id,
        OLD.id,
        'user_deleted',
        'user_profile',
        OLD.id,
        row_to_json(up),
        timezone('utc'::text, now())
    FROM public.user_profiles up 
    WHERE up.id = OLD.id;
    
    RETURN OLD;
END;
$$;

-- ============================================================================
-- PART 4: CREATE TRIGGERS ON AUTH.USERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- Create trigger for user deletion
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_delete();

-- ============================================================================
-- PART 5: CREATE REVERSE SYNC FUNCTION (OPTIONAL)
-- ============================================================================

-- Function to sync profile updates back to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update auth.users metadata when profile changes
    UPDATE auth.users 
    SET 
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'full_name', NEW.full_name,
            'role', NEW.role::text,
            'area', NEW.area,
            'phone', NEW.phone
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Create trigger for profile updates (optional - only if you want bi-directional sync)
DROP TRIGGER IF EXISTS on_profile_updated ON public.user_profiles;
CREATE TRIGGER on_profile_updated
    AFTER UPDATE OF full_name, role, area, phone ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_to_auth();

-- ============================================================================
-- PART 6: CREATE HELPER FUNCTION FOR TENANT ASSIGNMENT
-- ============================================================================

-- Function to assign user to specific tenant (for admin use)
CREATE OR REPLACE FUNCTION public.assign_user_to_tenant(
    user_id UUID,
    tenant_id UUID,
    user_role user_role DEFAULT 'Analyst'::user_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify tenant exists and is active
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND is_active = true) THEN
        RAISE EXCEPTION 'Tenant does not exist or is not active';
    END IF;
    
    -- Update user profile with new tenant
    UPDATE public.user_profiles 
    SET 
        tenant_id = assign_user_to_tenant.tenant_id,
        role = assign_user_to_tenant.user_role,
        updated_at = timezone('utc'::text, now())
    WHERE id = assign_user_to_tenant.user_id;
    
    -- Log the assignment
    INSERT INTO public.audit_log (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        new_values,
        created_at
    ) VALUES (
        assign_user_to_tenant.tenant_id,
        assign_user_to_tenant.user_id,
        'user_assigned_to_tenant',
        'user_profile',
        assign_user_to_tenant.user_id,
        jsonb_build_object(
            'tenant_id', assign_user_to_tenant.tenant_id,
            'role', assign_user_to_tenant.user_role
        ),
        timezone('utc'::text, now())
    );
    
    RETURN true;
END;
$$;

-- ============================================================================
-- PART 7: VERIFICATION AND TESTING
-- ============================================================================

-- Check that triggers are created
SELECT 
    'Trigger Verification' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    '✅ Trigger created successfully' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
AND trigger_name LIKE 'on_%_user%'
ORDER BY trigger_name;

-- Check that functions are created
SELECT 
    'Function Verification' as check_type,
    routine_name,
    routine_type,
    '✅ Function created successfully' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'handle_%user%' OR routine_name LIKE 'sync_%' OR routine_name = 'assign_user_to_tenant'
ORDER BY routine_name;

-- Final status
SELECT 
    'AUTH SYNC SETUP COMPLETE' as status,
    'Users created in auth.users will automatically create profiles in public.user_profiles' as message;

-- Usage instructions
SELECT 
    'USAGE INSTRUCTIONS' as instruction_type,
    'When users sign up via Supabase Auth, they will automatically get a profile in public.user_profiles' as auto_sync,
    'Use assign_user_to_tenant(user_id, tenant_id, role) to assign users to specific tenants' as manual_assignment,
    'Profile updates will sync metadata back to auth.users for consistency' as bi_directional_sync;