# Superadmin Panel Setup Guide

## 🚨 CRITICAL SECURITY WARNING 🚨

The superadmin panel provides complete platform-level access. Follow these security guidelines strictly:

- **NEVER** expose this in development/staging environments publicly
- **ALWAYS** use IP whitelisting in production
- **IMMEDIATELY** change default passwords
- **REGULARLY** monitor audit logs
- **RESTRICT** access to essential personnel only

## Prerequisites

1. Existing Stratix platform setup
2. Supabase database access
3. Administrative access to the server/deployment

## Setup Steps

### 1. Database Schema Setup

Run the superadmin schema extension:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -d postgres -U postgres -f scripts/superadmin-schema.sql
```

Or execute the SQL directly in Supabase SQL Editor:
- Open the SQL Editor in your Supabase dashboard
- Copy and paste the contents of `scripts/superadmin-schema.sql`
- Execute the script

### 2. Environment Configuration

Copy the superadmin environment variables to your `.env.local`:

```bash
# Copy template
cp .env.example.superadmin .env.local.superadmin

# Add to your main .env.local file
cat .env.local.superadmin >> .env.local
```

**Required Environment Variables:**

```env
# IP Whitelist (CRITICAL - restrict to your IPs only)
SUPERADMIN_IP_WHITELIST=your.office.ip,your.home.ip

# Session security
SUPERADMIN_SESSION_SECRET=generate-32-char-random-string
SUPERADMIN_SESSION_TIMEOUT=30
SUPERADMIN_MAX_LOGIN_ATTEMPTS=5

# Database (use same Supabase instance)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Initial Superadmin Account

The schema creates a default superadmin account:
- Email: `admin@Stratix-platform.com`
- Password: `TempPassword123!`

**⚠️ CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN**

### 4. IP Whitelisting Setup

1. Find your current IP:
   ```bash
   curl ifconfig.me
   ```

2. Add to environment variables:
   ```env
   SUPERADMIN_IP_WHITELIST=127.0.0.1,::1,YOUR_IP_HERE
   ```

3. For production, add your office/VPN IPs only

### 5. Deploy and Test

1. Deploy your application with the new environment variables

2. Access the superadmin panel:
   ```
   https://your-domain.com/superadmin/login
   ```

3. Login with default credentials (CHANGE IMMEDIATELY)

4. Verify IP restrictions are working by testing from a non-whitelisted IP

## Security Checklist

### Before Production Deployment:

- [ ] Changed default superadmin password
- [ ] Set up IP whitelisting with specific IPs only
- [ ] Configured strong session secret (32+ characters)
- [ ] Set short session timeout (30 minutes max)
- [ ] Tested access restrictions from non-whitelisted IPs
- [ ] Verified HTTPS is enforced
- [ ] Set up audit log monitoring
- [ ] Created backup superadmin account procedures
- [ ] Documented emergency access procedures

### Post-Deployment:

- [ ] Regular audit log reviews
- [ ] Password rotation schedule
- [ ] IP whitelist maintenance
- [ ] Security incident response plan
- [ ] Regular security assessments

## Available Features

### Tenant Management
- Create/edit/delete tenant organizations
- Configure tenant settings and domains
- Monitor tenant usage and status
- Apply area templates to tenants

### User Management
- View users across all tenants
- Create superadmin-managed users
- Transfer users between tenants
- Reset user passwords
- Manage user roles and permissions

### Area Templates
- Create reusable area structures
- Apply templates to new tenants
- Industry-specific templates
- Template versioning

### Audit & Security
- Comprehensive audit logging
- Security monitoring
- Failed access attempt tracking
- Administrative action history

## API Endpoints

### Authentication
- `POST /api/superadmin/auth/login` - Login
- `POST /api/superadmin/auth/logout` - Logout
- `GET /api/superadmin/auth/session` - Validate session

### Tenant Management
- `GET /api/superadmin/tenants` - List tenants
- `POST /api/superadmin/tenants` - Create tenant
- `GET /api/superadmin/tenants/[id]` - Get tenant details
- `PUT /api/superadmin/tenants/[id]` - Update tenant
- `DELETE /api/superadmin/tenants/[id]` - Soft delete tenant

### User Management
- `GET /api/superadmin/users` - Search users across tenants
- `POST /api/superadmin/users` - Create user
- `PUT /api/superadmin/users/[id]` - Update user
- `POST /api/superadmin/users/[id]/transfer` - Transfer user

### Audit
- `GET /api/superadmin/audit` - Get audit log entries

## Database Functions

Key PostgreSQL functions created:

```sql
-- Authentication
superadmin_authenticate(email, password, ip, user_agent)
superadmin_validate_session(session_token)
superadmin_logout(session_token, ip, user_agent)

-- Tenant Management
superadmin_create_tenant(superadmin_id, name, industry, description)
superadmin_get_tenants(superadmin_id)

-- User Management
superadmin_create_user(superadmin_id, tenant_id, email, name, role)

-- Area Templates
superadmin_create_area_template(superadmin_id, name, description, industry, template_data)

-- Maintenance
cleanup_expired_superadmin_sessions()
```

## Troubleshooting

### Common Issues

1. **Can't access login page**
   - Check IP whitelist configuration
   - Verify middleware is correctly routing superadmin paths
   - Check HTTPS enforcement

2. **Authentication fails**
   - Verify database connection
   - Check if superadmin account exists
   - Review audit logs for failed attempts

3. **Session expires immediately**
   - Check session secret configuration
   - Verify cookie settings for your domain
   - Check HTTPS configuration

4. **Database errors**
   - Ensure superadmin schema is properly installed
   - Check database permissions
   - Verify service role key has necessary permissions

### Logs and Monitoring

Check these locations for debugging:

1. **Application logs**: Check Next.js logs for middleware errors
2. **Database logs**: Supabase logs for function execution
3. **Audit table**: `superadmin_audit_log` for all actions
4. **Session table**: `superadmin_sessions` for active sessions

### Emergency Access Recovery

If locked out:

1. **Database access**: Use Supabase dashboard to reset password hash
2. **IP restrictions**: Temporarily disable IP whitelist via environment variables
3. **New superadmin**: Create via database functions directly

## Security Incident Response

If security breach suspected:

1. **Immediate**: Disable all superadmin sessions
   ```sql
   DELETE FROM superadmin_sessions;
   ```

2. **Review**: Check audit logs for suspicious activity
   ```sql
   SELECT * FROM superadmin_audit_log 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Reset**: Change all superadmin passwords and session secrets

4. **Monitor**: Enhanced monitoring for 48 hours

## Support

For security-related issues:
- Review audit logs first
- Check database function execution
- Verify environment configuration
- Test IP restrictions

**Never share superadmin credentials or access over insecure channels.**