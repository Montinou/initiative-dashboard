-- CLEAR AUTH TABLES ONLY
-- Run this BEFORE the insert_demo_data.sql script

-- Disable RLS temporarily to ensure we can delete everything
ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Disable triggers to prevent cascading issues
ALTER TABLE auth.identities DISABLE TRIGGER ALL;
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- Delete in correct order (identities first due to foreign key)
DELETE FROM auth.identities;
DELETE FROM auth.users WHERE email LIKE '%@%'; -- Only delete actual user records, keep system records

-- Re-enable triggers
ALTER TABLE auth.identities ENABLE TRIGGER ALL;  
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- Re-enable RLS
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Verify tables are clean
SELECT 'AUTH.USERS COUNT' as check_type, COUNT(*) as count FROM auth.users;
SELECT 'AUTH.IDENTITIES COUNT' as check_type, COUNT(*) as count FROM auth.identities;

SELECT 'AUTH TABLES CLEARED' as status, 'Ready for demo data insertion' as message;