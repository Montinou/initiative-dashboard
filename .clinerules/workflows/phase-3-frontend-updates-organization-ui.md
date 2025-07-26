# Phase 3: Frontend Updates - Organization UI

## Overview
This workflow covers the frontend updates needed to support multi-organization functionality in InsAIght, including organization management UI, context switching, team member management, and permission-based access controls.

## Prerequisites
- Phase 1 (Database Schema) completed
- Phase 2 (Backend API) completed
- Frontend development environment set up
- Access to the InsAIght Next.js codebase

## Tasks

### 1. Create Organization Context and Provider [TASK_FRONTEND_ORG_CONTEXT]

**Objective**: Set up React context for organization state management across the application.

**Steps**:
1. Create organization types:
   ```bash
   # Use Write tool to create types/organization.ts
   ```
   - Define Organization, TeamMember, and Permission interfaces
   - Create organization-related type exports

2. Create organization context:
   ```bash
   # Use Write tool to create contexts/OrganizationContext.tsx
   ```
   - Define context with current organization, members, and permissions
   - Create provider component with state management
   - Add organization switching functionality

3. Create organization hooks:
   ```bash
   # Use Write tool to create hooks/useOrganization.ts
   ```
   - `useOrganization`: Access current organization
   - `useOrganizationMembers`: Get team members
   - `usePermissions`: Check user permissions
   - `useOrganizationSwitch`: Switch between organizations

### 2. Update API Client with Organization Headers [TASK_FRONTEND_API_CLIENT]

**Objective**: Modify the API client to include organization context in all requests.

**Steps**:
1. Update API configuration:
   ```bash
   # Use Edit tool on lib/api-client.ts
   ```
   - Add organization ID to request headers
   - Create interceptor for organization context
   - Handle organization-scoped endpoints

2. Create organization API service:
   ```bash
   # Use Write tool to create services/organizationService.ts
   ```
   - List user organizations
   - Create/update organization
   - Manage team members
   - Handle invitations

### 3. Create Organization Switcher Component [TASK_FRONTEND_ORG_SWITCHER]

**Objective**: Build a UI component for switching between organizations.

**Steps**:
1. Create switcher component:
   ```bash
   # Use Write tool to create components/organization/OrganizationSwitcher.tsx
   ```
   - Dropdown with current organization
   - List of available organizations
   - Create new organization option
   - Visual indication of current org

2. Add to main layout:
   ```bash
   # Use Edit tool on app/layout.tsx
   ```
   - Include OrganizationSwitcher in header
   - Wrap app with OrganizationProvider

3. Style the component:
   ```bash
   # Use Edit tool on components/organization/OrganizationSwitcher.tsx
   ```
   - Match InsAIght design system
   - Add loading states
   - Include organization logos/avatars

### 4. Update Client Management with Organization Scope [TASK_FRONTEND_CLIENT_MGMT]

**Objective**: Modify client-related pages to work within organization context.

**Steps**:
1. Update client list page:
   ```bash
   # Use Edit tool on app/clients/page.tsx
   ```
   - Filter clients by organization
   - Add organization column if admin
   - Update create client flow

2. Update client form:
   ```bash
   # Use Edit tool on components/clients/ClientForm.tsx
   ```
   - Remove organization selection for non-admins
   - Auto-assign current organization
   - Add validation for organization context

3. Update client API calls:
   ```bash
   # Use Edit tool on services/clientService.ts
   ```
   - Include organization ID in requests
   - Handle organization-scoped responses

### 5. Create Team Member Management UI [TASK_FRONTEND_TEAM_MGMT]

**Objective**: Build interfaces for managing team members and invitations.

**Steps**:
1. Create team members page:
   ```bash
   # Use Write tool to create app/organization/team/page.tsx
   ```
   - List current team members
   - Show roles and permissions
   - Add/remove member actions

2. Create invitation component:
   ```bash
   # Use Write tool to create components/organization/InviteTeamMember.tsx
   ```
   - Email input with validation
   - Role selection dropdown
   - Send invitation button
   - Pending invitations list

3. Create member management dialog:
   ```bash
   # Use Write tool to create components/organization/ManageTeamMember.tsx
   ```
   - Update member role
   - Remove member confirmation
   - View member activity

### 6. Implement Organization Settings Pages [TASK_FRONTEND_ORG_SETTINGS]

**Objective**: Create settings pages for organization management.

**Steps**:
1. Create settings layout:
   ```bash
   # Use Write tool to create app/organization/settings/layout.tsx
   ```
   - Settings navigation sidebar
   - Nested routing structure
   - Permission-based menu items

2. Create general settings page:
   ```bash
   # Use Write tool to create app/organization/settings/general/page.tsx
   ```
   - Organization name/logo update
   - Description and metadata
   - Delete organization (admin only)

3. Create billing settings page:
   ```bash
   # Use Write tool to create app/organization/settings/billing/page.tsx
   ```
   - Subscription information
   - Payment methods
   - Usage statistics
   - Billing history

### 7. Update All Pages with Organization Context [TASK_FRONTEND_PAGE_UPDATES]

**Objective**: Ensure all existing pages use organization context appropriately.

**Steps**:
1. Update main dashboard:
   ```bash
   # Use Edit tool on app/page.tsx
   ```
   - Show organization-specific data
   - Update welcome message
   - Filter recent activity

2. Update analysis pages:
   ```bash
   # Use Edit tool on app/setup-kpis/page.tsx
   # Use Edit tool on app/results/page.tsx
   ```
   - Scope data to organization
   - Update breadcrumbs
   - Add organization context to API calls

3. Update navigation:
   ```bash
   # Use Edit tool on components/navigation/Sidebar.tsx
   ```
   - Add organization section
   - Update menu items based on permissions
   - Show organization-specific links

### 8. Implement Permission-Based UI Elements [TASK_FRONTEND_PERMISSIONS]

**Objective**: Create components that show/hide based on user permissions.

**Steps**:
1. Create permission guard component:
   ```bash
   # Use Write tool to create components/auth/PermissionGuard.tsx
   ```
   - Check user permissions
   - Conditionally render children
   - Show fallback for unauthorized

2. Create role-based navigation:
   ```bash
   # Use Edit tool on components/navigation/Sidebar.tsx
   ```
   - Filter menu items by role
   - Show admin-only sections
   - Update based on permissions

3. Update action buttons:
   ```bash
   # Use Grep tool to find action buttons
   # Use Edit tool on relevant components
   ```
   - Disable based on permissions
   - Show tooltips for disabled actions
   - Hide sensitive operations

### 9. Create Organization Onboarding Flow [TASK_FRONTEND_ONBOARDING]

**Objective**: Build a smooth onboarding experience for new organizations.

**Steps**:
1. Create onboarding wizard:
   ```bash
   # Use Write tool to create app/onboarding/page.tsx
   ```
   - Multi-step form
   - Organization creation
   - Initial team setup
   - First client creation

2. Create onboarding components:
   ```bash
   # Use Write tool to create components/onboarding/OrganizationSetup.tsx
   # Use Write tool to create components/onboarding/TeamSetup.tsx
   # Use Write tool to create components/onboarding/FirstClient.tsx
   ```
   - Step-by-step guidance
   - Progress indicator
   - Skip options

3. Add onboarding redirect:
   ```bash
   # Use Edit tool on middleware.ts
   ```
   - Check if user needs onboarding
   - Redirect new users
   - Mark onboarding complete

### 10. Update Navigation with Organization Context [TASK_FRONTEND_NAV_CONTEXT]

**Objective**: Ensure navigation elements reflect current organization context.

**Steps**:
1. Update breadcrumbs:
   ```bash
   # Use Edit tool on components/ui/breadcrumb.tsx
   ```
   - Include organization name
   - Update navigation hierarchy
   - Add organization switcher shortcut

2. Update page titles:
   ```bash
   # Use Grep tool to find page titles
   # Use Edit tool on relevant pages
   ```
   - Include organization name in title
   - Update meta descriptions
   - Add organization context

3. Create organization-aware links:
   ```bash
   # Use Write tool to create lib/navigation.ts
   ```
   - Helper functions for org-scoped URLs
   - Maintain organization context in links
   - Handle cross-organization navigation

## Validation Steps

After completing all tasks:

1. Test organization switching:
   - Switch between multiple organizations
   - Verify data isolation
   - Check permission updates

2. Test team management:
   - Invite new members
   - Update member roles
   - Remove team members

3. Test permission system:
   - Verify UI elements show/hide correctly
   - Test action restrictions
   - Validate API permissions

4. Test onboarding:
   - Create new organization
   - Complete onboarding flow
   - Verify initial setup

## Next Steps

After completing Phase 3:
- Proceed to Phase 4: Testing & Migration
- Update documentation
- Prepare deployment plan