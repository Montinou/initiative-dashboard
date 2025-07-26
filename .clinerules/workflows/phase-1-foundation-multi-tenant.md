# Phase 1: Foundation - Multi-Tenant Setup

<task name="phase-1-foundation-multi-tenant">

## task_objective

Implement the foundational multi-tenant architecture for InsAIght by creating Organization and Client models, updating database schemas, implementing organization management endpoints, adding security middleware, and integrating with Clerk organization features.

## detailed_sequence_steps

1. **Create Organization and Client Models**
   - Use `Read` to examine the existing backend model structure at `/mnt/e/Projects/Mariana projectos/InsAIght/backend/models/`
   - Create new Pydantic models for Organization and Client entities
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/models/organization.py` with Organization model
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/models/client.py` with Client model
   - Include fields for organization_id, client_id, name, created_at, updated_at, and metadata

2. **Update BigQuery Database Schemas**
   - Use `Read` to examine existing BigQuery table creation scripts at `/mnt/e/Projects/Mariana projectos/InsAIght/backend/create_bigquery_table.sh`
   - Create new BigQuery tables for organizations and clients
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/create_org_tables.sql` with table definitions
   - Update the existing create_bigquery_table.sh script to include new organization tables
   - Add organization_id and client_id columns to existing analysis_history table

3. **Implement Organization Management Endpoints**
   - Use `Read` to examine the existing API router structure at `/mnt/e/Projects/Mariana projectos/InsAIght/backend/main.py`
   - Create a new router module for organization management
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/routers/organizations.py`
   - Implement CRUD endpoints for organizations:
     - POST /api/v1/organizations - Create organization
     - GET /api/v1/organizations/{org_id} - Get organization details
     - PUT /api/v1/organizations/{org_id} - Update organization
     - GET /api/v1/organizations/{org_id}/clients - List clients
   - Implement CRUD endpoints for clients:
     - POST /api/v1/organizations/{org_id}/clients - Create client
     - GET /api/v1/organizations/{org_id}/clients/{client_id} - Get client details
     - PUT /api/v1/organizations/{org_id}/clients/{client_id} - Update client
   - Use `Edit` to update main.py to include the new organization router

4. **Add Security Middleware for Multi-Tenancy**
   - Use `Read` to examine existing authentication structure if any
   - Create authentication middleware for organization context
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/middleware/auth.py`
   - Implement middleware to:
     - Extract organization_id from JWT claims or headers
     - Validate organization access rights
     - Inject organization context into requests
   - Use `Edit` to update main.py to include the authentication middleware
   - Create dependency injection functions for organization validation

5. **Integrate Clerk Organization Features**
   - Use `Read` to check for existing Clerk integration in the frontend
   - Update environment configuration for Clerk organization support
   - Use `Edit` to modify `/mnt/e/Projects/Mariana projectos/InsAIght/.env.example` to include Clerk organization variables
   - Create backend service for Clerk webhook handling
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/services/clerk_sync.py`
   - Implement webhook endpoints for:
     - Organization created/updated/deleted events
     - User membership changes
     - Automatic sync between Clerk and BigQuery organizations
   - Use `Edit` to update main.py to include Clerk webhook endpoints

6. **Update Existing Endpoints for Multi-Tenancy**
   - Use `Grep` to find all existing API endpoints that handle data
   - Update each endpoint to include organization_id filtering:
     - /api/v1/upload - Associate uploads with organization/client
     - /api/v1/analyze - Filter analysis by organization
     - /api/v1/projects/{project_name}/history - Filter by organization
   - Use `MultiEdit` to update query parameters and database queries
   - Add organization_id validation to all data access operations

7. **Create Migration Scripts**
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/migrations/001_add_multi_tenancy.sql`
   - Include SQL statements to:
     - Add organization_id and client_id to existing tables
     - Create indexes for performance
     - Set up foreign key relationships
   - Create a migration runner script
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/run_migrations.sh`

8. **Update Frontend Context and Hooks**
   - Use `Read` to examine the frontend structure at `/mnt/e/Projects/Mariana projectos/InsAIght/app/`
   - Create React context for organization state
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/app/contexts/OrganizationContext.tsx`
   - Create custom hooks for organization data
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/app/hooks/useOrganization.ts`
   - Update API client to include organization headers
   - Use `Edit` to modify API calls to include organization context

9. **Test Multi-Tenant Functionality**
   - Use `Bash` to run the backend with new multi-tenant features
   - Create test scripts for organization CRUD operations
   - Use `Write` to create `/mnt/e/Projects/Mariana projectos/InsAIght/backend/tests/test_organizations.py`
   - Verify data isolation between organizations
   - Test Clerk webhook integration
   - Ensure existing functionality works with organization context

10. **Update Documentation**
    - Use `Edit` to update `/mnt/e/Projects/Mariana projectos/InsAIght/CLAUDE.md` with multi-tenant architecture notes
    - Document new API endpoints and authentication flow
    - Add environment variable documentation for Clerk organization setup
    - Include migration instructions for existing deployments

## attempt_completion

After completing all steps, the foundation for multi-tenant architecture will be established with:
- Organization and Client data models implemented
- BigQuery schemas updated with multi-tenant support
- Full CRUD API for organization management
- Security middleware enforcing organization boundaries
- Clerk organization integration for authentication
- All existing endpoints updated for multi-tenancy
- Frontend context and hooks for organization state
- Complete test coverage for multi-tenant features

</task>