-- Add missing columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN public.user_profiles.is_system_admin IS 'Whether the user has system admin privileges';
COMMENT ON COLUMN public.user_profiles.last_login IS 'Last login timestamp for the user';