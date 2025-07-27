-- Create a simple trigger function that only handles essential columns
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if the user profile doesn't already exist
    INSERT INTO public.user_profiles (id, email, role) 
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Analyst'::user_role)
    ) ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;