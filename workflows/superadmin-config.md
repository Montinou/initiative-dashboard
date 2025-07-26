<task name="Superadmin Configuration Panel">

<task_objective>
Create a completely separate superadmin panel with its own authentication system for platform-level management of all tenant companies. The superadmin will have elevated privileges to configure basic company structures including tenant creation/management, user administration across tenants, company areas configuration, and domain settings. This is a platform-level administrative interface separated from regular tenant admin panels for maximum security. Output will be a standalone admin application with dedicated authentication, database schema extensions, and comprehensive tenant management capabilities.
</task_objective>

<detailed_sequence_steps>
# Superadmin Configuration Panel - Detailed Sequence of Steps

## 🚨 CRITICAL SECURITY REQUIREMENTS 🚨
- **MUST** implement completely separate authentication system
- **MUST** use dedicated superadmin-only database tables and functions
- **MUST** implement comprehensive audit logging for all superadmin actions
- **NEVER** expose superadmin functionality through regular tenant routes
- **ALWAYS** validate superadmin permissions at database level
- **MUST** implement IP whitelist and additional security measures

## 1. Database Schema Extensions

1. **Create Superadmin Tables**
   - Create `superadmins` table:
     - id (UUID, Primary Key)
     - email (TEXT, UNIQUE, NOT NULL)
     - name (TEXT, NOT NULL)
     - password_hash (TEXT, NOT NULL) - bcrypt hashed
     - is_active (BOOLEAN, DEFAULT true)
     - last_login (TIMESTAMP)
     - created_at (TIMESTAMP)
     - updated_at (TIMESTAMP)
   
   - Create `superadmin_sessions` table:
     - id (UUID, Primary Key)
     - superadmin_id (UUID, Foreign Key to superadmins.id)
     - session_token (TEXT, UNIQUE, NOT NULL)
     - expires_at (TIMESTAMP, NOT NULL)
     - ip_address (INET)
     - user_agent (TEXT)
     - created_at (TIMESTAMP)
   
   - Create `superadmin_audit_log` table:
     - id (UUID, Primary Key)
     - superadmin_id (UUID, Foreign Key to superadmins.id)
     - action (TEXT, NOT NULL) - e.g., 'CREATE_TENANT', 'DELETE_USER'
     - target_type (TEXT, NOT NULL) - e.g., 'tenant', 'user', 'area'
     - target_id (UUID) - ID of affected entity
     - details (JSONB) - Additional context
     - ip_address (INET)
     - created_at (TIMESTAMP)

2. **Extend Existing Tables for Superadmin Access**
   - Add `created_by_superadmin` UUID field to `tenants` table
   - Add `is_system_admin` BOOLEAN field to `users` table for superadmin-created accounts
   - Create indexes for efficient superadmin queries

3. **Create Superadmin-Only Functions**
   ```sql
   -- Tenant management functions
   CREATE FUNCTION superadmin_create_tenant(...)
   CREATE FUNCTION superadmin_update_tenant(...)
   CREATE FUNCTION superadmin_delete_tenant(...)
   
   -- User management functions
   CREATE FUNCTION superadmin_create_user(...)
   CREATE FUNCTION superadmin_transfer_user(...)
   CREATE FUNCTION superadmin_reset_user_password(...)
   
   -- Area management functions
   CREATE FUNCTION superadmin_create_area_template(...)
   CREATE FUNCTION superadmin_apply_area_template(...)
   ```

## 2. Superadmin Authentication System

1. **Create Separate Auth Service**
   - Implement bcrypt password hashing
   - Create session-based authentication (not JWT for security)
   - Implement session timeout (30 minutes idle)
   - Add brute force protection
   - Implement IP whitelist validation

2. **Create Auth API Routes**
   - `POST /api/superadmin/auth/login` - Login with email/password
   - `POST /api/superadmin/auth/logout` - Destroy session
   - `GET /api/superadmin/auth/session` - Validate current session
   - `POST /api/superadmin/auth/refresh` - Extend session

3. **Implement Security Middleware**
   ```typescript
   // Superadmin-only middleware
   // - Validate session token
   // - Check IP whitelist
   // - Log all access attempts
   // - Implement rate limiting
   ```

## 3. Superadmin Frontend Application

1. **Create Separate Route Structure**
   - `/superadmin/login` - Login page (separate from tenant auth)
   - `/superadmin/dashboard` - Main dashboard
   - `/superadmin/tenants` - Tenant management
   - `/superadmin/users` - Cross-tenant user management
   - `/superadmin/areas` - Area template management
   - `/superadmin/domains` - Domain configuration
   - `/superadmin/audit` - Audit log viewer
   - `/superadmin/settings` - Superadmin settings

2. **Implement Superadmin Layout**
   - Reuse UI components but create separate layout
   - Add superadmin-specific navigation
   - Implement breadcrumbs for deep navigation
   - Add quick action buttons
   - Include system status indicators

3. **Create Superadmin Components**
   - `SuperadminGuard` - Route protection component
   - `TenantManagementTable` - CRUD for tenants
   - `CrossTenantUserTable` - User management across tenants
   - `AreaTemplateBuilder` - Create reusable area templates
   - `DomainConfigPanel` - Manage tenant domains
   - `AuditLogViewer` - Security audit interface

## 4. Tenant Management Features

1. **Tenant CRUD Operations**
   - Create new tenant with basic structure
   - Edit tenant information (name, industry, description)
   - Soft delete tenants (maintain data integrity)
   - Restore deleted tenants
   - Clone tenant structure to new tenant

2. **Tenant Configuration**
   - Configure default areas for new tenants
   - Set up initial admin users
   - Configure domain settings
   - Set tenant-specific settings
   - Apply area templates

3. **Tenant Monitoring**
   - View tenant usage statistics
   - Monitor active users per tenant
   - Track tenant feature usage
   - View tenant health status

## 5. Cross-Tenant User Management

1. **User Search and Management**
   - Search users across all tenants
   - Filter by tenant, role, status
   - View user activity across tenants
   - Manage user roles and permissions

2. **User Operations**
   - Create admin users for any tenant
   - Transfer users between tenants
   - Reset user passwords
   - Deactivate/reactivate users
   - Merge duplicate user accounts

3. **Bulk Operations**
   - Import users from CSV
   - Bulk role changes
   - Bulk tenant transfers
   - Mass password resets

## 6. Area Template Management

1. **Template Creation**
   - Create reusable area structures
   - Define area hierarchies
   - Set default permissions per area
   - Create industry-specific templates

2. **Template Application**
   - Apply templates to existing tenants
   - Customize templates during application
   - Preview template before applying
   - Track template usage

3. **Template Versioning**
   - Version control for templates
   - Rollback capability
   - Template change history
   - Template performance analytics

## 7. Domain Configuration Panel

1. **Global Domain Management**
   - View all configured domains
   - Manage domain-to-tenant mappings
   - Configure wildcard domains
   - Set up domain redirects

2. **Domain Validation**
   - Verify domain ownership
   - Check DNS configuration
   - Validate SSL certificates
   - Monitor domain health

3. **Domain Analytics**
   - Track domain usage
   - Monitor failed domain attempts
   - Generate domain reports

## 8. Security and Audit Features

1. **Comprehensive Audit Logging**
   - Log all superadmin actions
   - Track data changes with before/after
   - Monitor failed login attempts
   - Record IP addresses and user agents

2. **Security Monitoring**
   - Real-time security alerts
   - Suspicious activity detection
   - Failed access attempt tracking
   - IP-based threat monitoring

3. **Audit Reporting**
   - Generate security reports
   - Export audit logs
   - Compliance reporting
   - Activity timeline views

## 9. API Design for Frontend Integration

1. **Tenant Management APIs**
   ```typescript
   GET /api/superadmin/tenants - List all tenants
   POST /api/superadmin/tenants - Create tenant
   PUT /api/superadmin/tenants/:id - Update tenant
   DELETE /api/superadmin/tenants/:id - Delete tenant
   GET /api/superadmin/tenants/:id/users - Get tenant users
   GET /api/superadmin/tenants/:id/areas - Get tenant areas
   ```

2. **User Management APIs**
   ```typescript
   GET /api/superadmin/users - Search users across tenants
   POST /api/superadmin/users - Create user in any tenant
   PUT /api/superadmin/users/:id - Update user
   POST /api/superadmin/users/:id/transfer - Transfer to different tenant
   POST /api/superadmin/users/:id/reset-password - Reset password
   ```

3. **Area Template APIs**
   ```typescript
   GET /api/superadmin/area-templates - List templates
   POST /api/superadmin/area-templates - Create template
   PUT /api/superadmin/area-templates/:id - Update template
   POST /api/superadmin/area-templates/:id/apply - Apply to tenant
   ```

## 10. Implementation Security Checklist

1. **Authentication Security**
   - ✅ Separate login system from tenant auth
   - ✅ Strong password requirements
   - ✅ Session-based auth with short timeouts
   - ✅ IP whitelist validation
   - ✅ Brute force protection

2. **Authorization Security**
   - ✅ Database-level permission validation
   - ✅ Function-level access control
   - ✅ Route-level protection
   - ✅ API endpoint protection

3. **Data Security**
   - ✅ No sensitive data access (passwords, payment info)
   - ✅ Encrypted session tokens
   - ✅ Audit trail for all actions
   - ✅ Soft delete for data recovery

4. **Infrastructure Security**
   - ✅ Separate deployment considerations
   - ✅ Environment variable protection
   - ✅ Database connection security
   - ✅ HTTPS enforcement

## Required Environment Variables

- `SUPERADMIN_DATABASE_URL` - Dedicated connection string
- `SUPERADMIN_SESSION_SECRET` - Session encryption key
- `SUPERADMIN_IP_WHITELIST` - Comma-separated IP addresses
- `SUPERADMIN_PASSWORD_SALT_ROUNDS` - bcrypt salt rounds (12+)
- `SUPERADMIN_SESSION_TIMEOUT` - Session timeout in minutes
- `SUPERADMIN_MAX_LOGIN_ATTEMPTS` - Brute force protection

## Implementation Notes

- Implement rate limiting on all superadmin endpoints
- Use prepared statements for all database queries
- Implement database connection pooling for performance
- Consider implementing 2FA for additional security
- Plan for horizontal scaling if managing many tenants
- Implement health checks for monitoring
- Consider implementing backup/restore capabilities
- Plan for disaster recovery procedures

## Testing Strategy

1. **Security Testing**
   - Penetration testing of auth system
   - SQL injection testing
   - Session hijacking prevention
   - Cross-site scripting (XSS) prevention

2. **Functional Testing**
   - Tenant CRUD operations
   - User management across tenants
   - Area template functionality
   - Domain configuration

3. **Performance Testing**
   - Load testing with many tenants
   - Concurrent superadmin sessions
   - Large dataset operations
   - Database performance optimization

</detailed_sequence_steps>

</task>