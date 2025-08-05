# Supabase Setup Guide for Initiative Dashboard

## Overview

This guide walks you through setting up Supabase for the Initiative Dashboard project.

## Prerequisites

1. A Supabase account ([sign up here](https://supabase.com))
2. Node.js >= 20.0.0
3. PNPM >= 10.0.0

## Setup Steps

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Project name: `initiative-dashboard`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Click "Create Project"

### 2. Get Your API Keys

Once your project is created:

1. Go to Project Settings > API
2. Copy these values:
   - Project URL (looks like: `https://xxxxxxxxxxxx.supabase.co`)
   - Anon/Public Key (safe for browser use)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

### 4. Run Database Migrations

The project includes migration scripts in the `supabase/migrations` folder. Run them in order:

1. First, ensure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

### 5. Enable Row Level Security (RLS)

RLS is crucial for multi-tenant security. The migrations should have set this up, but verify:

1. Go to Supabase Dashboard > Table Editor
2. For each table, ensure RLS is enabled (shield icon should be green)
3. Check that policies are created for each table

### 6. Create Initial Data

#### Create a Superadmin (Optional)
```sql
-- Run this in Supabase SQL Editor
INSERT INTO superadmins (email, name, password_hash)
VALUES ('admin@example.com', 'Admin User', crypt('your-password', gen_salt('bf')));
```

#### Create a Test Tenant
```sql
-- Create a test tenant
INSERT INTO tenants (name, subdomain, description, industry)
VALUES ('Demo Company', 'demo', 'Demo tenant for testing', 'Technology');
```

#### Create a Test User
1. Use the Auth > Users section in Supabase Dashboard
2. Click "Invite User"
3. Enter email and password
4. After user is created, create their profile:

```sql
-- Replace 'user-uuid' with the actual user ID from Auth
INSERT INTO user_profiles (
  id,
  user_id,
  tenant_id,
  email,
  full_name,
  role
) VALUES (
  'user-uuid',
  'user-uuid',
  (SELECT id FROM tenants WHERE subdomain = 'demo'),
  'user@example.com',
  'Test User',
  'Admin'
);
```

### 7. Test Your Setup

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to http://localhost:3000/auth/login

3. Try logging in with your test user credentials

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error
- Double-check your environment variables
- Ensure you're using the anon/public key, not the service role key
- Restart your development server after changing env vars

#### 2. "User profile not found" Error
- Ensure user_profiles table has an entry for your auth user
- Check that the user_id in user_profiles matches the auth.users id

#### 3. CORS Errors
- Go to Project Settings > API
- Add your domain to allowed origins

#### 4. RLS Policy Errors
- Check that your user has the proper role in user_profiles
- Verify RLS policies are correctly set up
- Use the Supabase Dashboard's "SQL Editor" to test queries

### Debug Mode

To enable detailed logging:

1. Set in your `.env.local`:
   ```env
   NEXT_PUBLIC_DEBUG=true
   ```

2. Check browser console for detailed auth logs

## Security Best Practices

1. **Never commit `.env.local`** - it's already in .gitignore
2. **Use RLS policies** - they're your primary security layer
3. **Validate all inputs** - both client and server-side
4. **Keep your Supabase project updated** - check for security updates

## Next Steps

1. Review the [Supabase Auth docs](https://supabase.com/docs/guides/auth)
2. Customize RLS policies for your needs
3. Set up email templates in Authentication > Email Templates
4. Configure OAuth providers if needed

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Project Issues](https://github.com/Montinou/initiative-dashboard/issues)
