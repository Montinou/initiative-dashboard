# User Creation with Custom Roles

This directory contains scripts for creating users with proper role handling for the Stratix platform. There are two approaches: production-ready API method and direct database method.

## ✅ Recommended: Production API Method

### Setup

1. **Install dependencies:**
   ```bash
   cd database
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. **Run the script:**
   ```bash
   npm run create-users
   ```

### Features

- ✅ Uses Supabase Admin API (recommended)
- ✅ Proper role management via `app_metadata`
- ✅ Handles existing users gracefully
- ✅ Creates user profiles with tenant associations
- ✅ Comprehensive error handling and logging
- ✅ Verification queries included

### What it creates:

| Email | Role | Tenant | Area |
|-------|------|--------|------|
| admin@stratix-platform.com | CEO | Stratix | Technology |
| manager@stratix-platform.com | Manager | Stratix | Sales |
| analyst@stratix-platform.com | Analyst | Stratix | Operations |
| admin@fema-electricidad.com | CEO | FEMA | Administración |
| manager@fema-electricidad.com | Manager | FEMA | División Industria |
| analyst@fema-electricidad.com | Analyst | FEMA | E-commerce |
| admin@siga-turismo.com | CEO | SIGA | Administración |
| manager@siga-turismo.com | Manager | SIGA | Desarrollo Turístico |
| analyst@siga-turismo.com | Analyst | SIGA | Marketing y Promoción |
| superadmin@stratix-platform.com | superadmin | None | None |

**Default password for all users:** `password123`

## ⚠️ Alternative: Direct Database Method

### Files:
- `create-auth-users-with-roles.sql` - Enhanced version with proper role handling
- `create-auth-users.sql` - Basic version

### Usage:
```sql
-- Run this in Supabase SQL editor or psql
\i create-auth-users-with-roles.sql
```

### Important Notes:
- **Not recommended for production**
- Direct database insertion bypasses Supabase's auth flow
- May cause issues with authentication
- Use only for development/testing

## Custom Role System

### Role Types (Case-Sensitive!)
- `superadmin` - Platform administration
- `CEO` - Organization leader
- `Admin` - Administrative access
- `Manager` - Department management
- `Analyst` - Data analysis and reporting

### Role Storage:
1. **auth.users.raw_app_metadata.role** - Primary role source
2. **public.user_profiles.role** - Cast to `user_role` ENUM type
3. **auth.identities.identity_data.role** - For client-side access

### Permissions:
Roles are used in Row Level Security (RLS) policies and application logic to control:
- Dashboard access levels
- Data visibility
- Action permissions
- Multi-tenant isolation

## Troubleshooting

### Common Issues:

1. **"User already exists"**
   - Script handles this automatically by updating metadata
   - No action needed

2. **"Tenant not found"**
   - Ensure tenants are created first using `complete-data-setup.sql`
   - Check tenant subdomain spelling

3. **"Role enum error"**
   - Run the database migration first to create the `user_role` type
   - Check that all roles match exactly (case-sensitive)

4. **Authentication issues**
   - Verify SUPABASE_SERVICE_ROLE_KEY is correct
   - Check Supabase URL format

### Verification:

After running either script, verify users were created correctly:

```sql
SELECT 
    u.email,
    u.raw_app_meta_data->>'role' as auth_role,
    up.role as profile_role,
    t.name as tenant_name,
    up.area,
    u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.tenants t ON up.tenant_id = t.id
WHERE u.email LIKE '%@stratix-platform.com' 
   OR u.email LIKE '%@fema-electricidad.com'
   OR u.email LIKE '%@siga-turismo.com'
ORDER BY 
    CASE WHEN u.email LIKE '%superadmin%' THEN 0 ELSE 1 END,
    t.name,
    up.role;
```

## Security Notes

- Service role key has full database access - keep secure
- Default passwords should be changed in production
- Consider implementing password reset flow
- Enable MFA for superadmin accounts
- Regularly audit user roles and permissions

## Next Steps

After creating users:
1. Test login with each user type
2. Verify role-based access controls
3. Set up proper password reset flow
4. Configure MFA for sensitive accounts
5. Set up audit logging for role changes