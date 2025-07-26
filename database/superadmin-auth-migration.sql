-- Migration to change superadmin authentication to use auth.users with user_profiles.role = 'superadmin'

-- 1. Update user_role enum to include 'superadmin'
ALTER TYPE user_role ADD VALUE 'superadmin';

-- 2. Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = user_id 
    AND role = 'superadmin'
    AND is_active = true
  );
END;
$$;

-- 3. Create function to get superadmin profile
CREATE OR REPLACE FUNCTION public.get_superadmin_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role user_role,
  is_active BOOLEAN,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role,
    up.is_active,
    up.last_login,
    up.created_at
  FROM public.user_profiles up
  WHERE up.id = user_id 
  AND up.role = 'superadmin'
  AND up.is_active = true;
END;
$$;

-- 4. Create RLS policy for superadmin access
CREATE POLICY "Superadmins can access all profiles" ON public.user_profiles
FOR ALL USING (
  public.is_superadmin(auth.uid())
);

-- 5. Create audit log table for superadmin actions (keeping existing structure)
CREATE TABLE IF NOT EXISTS public.superadmin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_log_superadmin_id 
ON public.superadmin_audit_log(superadmin_id);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_log_created_at 
ON public.superadmin_audit_log(created_at DESC);

-- 7. Enable RLS on audit log
ALTER TABLE public.superadmin_audit_log ENABLE ROW LEVEL SECURITY;

-- 8. Create policy for audit log access
CREATE POLICY "Superadmins can access audit logs" ON public.superadmin_audit_log
FOR ALL USING (
  public.is_superadmin(auth.uid())
);

-- 9. Function to create superadmin user
CREATE OR REPLACE FUNCTION public.create_superadmin_user(
  email TEXT,
  password TEXT,
  full_name TEXT
)
RETURNS TABLE (
  user_id UUID,
  profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_profile_id UUID;
BEGIN
  -- Create user in auth.users via Supabase Auth API
  -- This function assumes the user is created externally via Supabase Auth
  -- and then we update the profile
  
  -- For now, this is a placeholder - actual user creation should be done
  -- via Supabase Auth Admin API in the application layer
  
  RAISE EXCEPTION 'This function is a placeholder. Use Supabase Auth Admin API to create users.';
END;
$$;

-- 10. Function to promote existing user to superadmin
CREATE OR REPLACE FUNCTION public.promote_to_superadmin(
  target_user_id UUID,
  promoted_by_superadmin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the promoter is a superadmin
  IF NOT public.is_superadmin(promoted_by_superadmin_id) THEN
    RAISE EXCEPTION 'Only superadmins can promote users to superadmin';
  END IF;
  
  -- Update user profile to superadmin role
  UPDATE public.user_profiles 
  SET 
    role = 'superadmin',
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO public.superadmin_audit_log (
    superadmin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    promoted_by_superadmin_id,
    'PROMOTE_TO_SUPERADMIN',
    'user_profile',
    target_user_id::TEXT,
    jsonb_build_object(
      'promoted_user_id', target_user_id,
      'previous_role', (SELECT role FROM public.user_profiles WHERE id = target_user_id)
    )
  );
  
  RETURN TRUE;
END;
$$;

-- 11. Function to revoke superadmin privileges
CREATE OR REPLACE FUNCTION public.revoke_superadmin(
  target_user_id UUID,
  revoked_by_superadmin_id UUID,
  new_role user_role DEFAULT 'Admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the revoker is a superadmin
  IF NOT public.is_superadmin(revoked_by_superadmin_id) THEN
    RAISE EXCEPTION 'Only superadmins can revoke superadmin privileges';
  END IF;
  
  -- Prevent self-revocation (at least one superadmin must remain)
  IF target_user_id = revoked_by_superadmin_id THEN
    -- Check if there are other superadmins
    IF (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'superadmin' AND is_active = true) <= 1 THEN
      RAISE EXCEPTION 'Cannot revoke the last active superadmin';
    END IF;
  END IF;
  
  -- Update user profile role
  UPDATE public.user_profiles 
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO public.superadmin_audit_log (
    superadmin_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    revoked_by_superadmin_id,
    'REVOKE_SUPERADMIN',
    'user_profile',
    target_user_id::TEXT,
    jsonb_build_object(
      'revoked_user_id', target_user_id,
      'new_role', new_role
    )
  );
  
  RETURN TRUE;
END;
$$;

-- 12. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_superadmin_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_superadmin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_superadmin(UUID, UUID, user_role) TO authenticated;

-- 13. Create initial superadmin user (replace with actual user ID)
-- This should be run after creating a user via Supabase Auth
-- UPDATE public.user_profiles 
-- SET role = 'superadmin'
-- WHERE email = 'admin@stratix-platform.com';

COMMENT ON FUNCTION public.is_superadmin IS 'Check if a user has superadmin role';
COMMENT ON FUNCTION public.get_superadmin_profile IS 'Get superadmin profile information';
COMMENT ON FUNCTION public.promote_to_superadmin IS 'Promote a user to superadmin role';
COMMENT ON FUNCTION public.revoke_superadmin IS 'Revoke superadmin privileges from a user';
COMMENT ON TABLE public.superadmin_audit_log IS 'Audit log for superadmin actions';