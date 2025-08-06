# Auth Schema Issues Found & Fixed

## Critical Issues Found

### Database Schema Issues (DATABASE CHANGES NEEDED)

The following tables in your Supabase schema incorrectly reference `auth.users(id)` directly from the public schema:

1. **`activities` table** (Line 26 in schema-public.sql):
   ```sql
   CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
   ```
   **Should be**: 
   ```sql
   CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
   ```

2. **`initiatives` table** (Line 158 in schema-public.sql):
   ```sql
   CONSTRAINT initiatives_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
   ```
   **Should be**:
   ```sql
   CONSTRAINT initiatives_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id)
   ```

3. **`user_profiles` table schema discrepancy**:
   - Current migration (20250126000001_clean_setup.sql line 48): `id UUID PRIMARY KEY REFERENCES auth.users(id)`
   - Actual schema (schema-public.sql lines 315-317): Has separate `user_id` field that references auth.users

### RLS Policy Issues (DATABASE CHANGES NEEDED)

Some RLS policies use `up.id = auth.uid()` when they should use `up.user_id = auth.uid()`:

1. **User profile policies** in `20250126000001_clean_setup.sql`:
   - Line 175: `id = auth.uid()` - Should be `user_id = auth.uid()`
   - Line 176: `up.id = auth.uid()` - Should be `up.user_id = auth.uid()`
   - And several others throughout the policies

## Code Issues Fixed

### ✅ Fixed: Incorrect user_profiles Creation Patterns

1. **app/api/users/route.ts** (Line 164-165):
   - ❌ Was: `id: authUser.user.id, user_id: authUser.user.id`
   - ✅ Fixed: `user_id: authUser.user.id` (removed duplicate id assignment)

2. **app/api/profile/setup/route.ts** (Line 53):
   - ❌ Was: `id: user.id`
   - ✅ Fixed: `user_id: user.id`

3. **app/api/superadmin/users/route.ts** (Line 227):
   - ❌ Was: `id: userId`
   - ✅ Fixed: `user_id: userId`

4. **lib/db-init.ts** (Line 44):
   - ❌ Was: `id UUID PRIMARY KEY REFERENCES auth.users(id)`
   - ✅ Fixed: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID UNIQUE REFERENCES auth.users(id)`

### ✅ Fixed: Duplicate Auth Calls

1. **hooks/useUsers.ts**:
   - ❌ Was calling `supabase.auth.getUser()` when `session` was already available from context
   - ✅ Fixed: Now uses session and profile from auth context

## Schema Design Summary

### ✅ Correct Pattern (What you want):
```sql
-- user_profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- Auto-generated profile ID
  user_id UUID UNIQUE REFERENCES auth.users(id),  -- Links to auth user
  tenant_id UUID REFERENCES tenants(id),
  -- other fields...
);

-- Other tables reference user_profiles.id
CREATE TABLE initiatives (
  owner_id UUID REFERENCES user_profiles(id),     -- References profile, not auth
  -- other fields...
);

-- RLS policies use user_id for auth checks
CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (user_id = auth.uid());
```

### ❌ Incorrect Pattern (What was found):
```sql
-- DON'T DO THIS - Public tables referencing auth schema directly
CREATE TABLE activities (
  assigned_to UUID REFERENCES auth.users(id)      -- BAD: Direct auth reference
);

CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id)               -- BAD: Profile ID = Auth ID
);
```

## Summary

**Database Changes Required (You Need To Fix):**
- Update foreign key constraints in `activities` and `initiatives` tables
- Fix RLS policies to use `user_id = auth.uid()` pattern
- Ensure user_profiles schema matches the intended design

**Code Changes (Fixed by me):**
- ✅ All user profile creation now uses correct `user_id` field
- ✅ Removed duplicate auth calls
- ✅ Fixed table definition patterns in lib/db-init.ts

The application code now follows proper patterns, but the database schema needs to be updated to match the intended design where only `user_profiles.user_id` references auth schema.