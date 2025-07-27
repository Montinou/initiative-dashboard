-- Fix the handle_new_user trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role,
        tenant_id,
        area,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        -- Cast the role to user_role enum type
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role, 
            'Analyst'::user_role
        ),
        -- Use tenant_id from metadata if provided, otherwise default to first tenant
        COALESCE(
            (NEW.raw_user_meta_data->>'tenant_id')::uuid,
            (SELECT id FROM public.tenants WHERE is_active = true LIMIT 1)
        ),
        -- Set area based on role
        CASE 
            WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'Analyst') = 'CEO' THEN 'Executive'
            WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'Analyst') = 'Admin' THEN 'Administration'
            WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'Analyst') = 'Manager' THEN 'Management'
            ELSE 'General'
        END,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;