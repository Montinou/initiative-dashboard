-- Temporarily disable the trigger to test auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a dummy function that does nothing
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Do nothing for now - just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;