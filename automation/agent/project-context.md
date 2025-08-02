# Automation Agent - Project-Specific Context

## Application Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + Radix UI
- **State**: React Hooks + SWR
- **File Handling**: Excel uploads via `xlsx`
- **AI Integration**: Stratix Assistant (Google AI)

### Key Application Features

#### 1. Multi-tenant Architecture
```typescript
// Test tenant isolation
interface TenantContext {
  tenantId: string;
  name: string;
  features: string[];
}
```

#### 2. Role-based Access Control
```typescript
// Test different user roles
type UserRole = 'admin' | 'manager' | 'user' | 'superadmin';
```

#### 3. Core Entities
- **Initiatives**: Project management with file uploads
- **OKRs**: Objectives and Key Results tracking
- **Areas**: Organizational structure
- **Users**: Multi-role user management
- **Files**: Excel processing and data import

### Database Schema Context

#### Key Tables to Test
```sql
-- Users and authentication
users (id, email, role, tenant_id, created_at)
user_profiles (user_id, full_name, avatar_url)

-- Core business entities
initiatives (id, title, description, status, area_id, owner_id)
okrs (id, title, description, progress, initiative_id)
areas (id, name, description, manager_id, tenant_id)

-- File processing
file_uploads (id, filename, status, user_id, initiative_id)
file_processing_logs (id, file_id, status, error_message)
```

### API Endpoints to Test

#### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`  
- `GET /api/auth/user`
- `POST /api/auth/refresh`

#### Initiatives
- `GET /api/initiatives` - List with filters
- `POST /api/initiatives` - Create new
- `PUT /api/initiatives/[id]` - Update
- `DELETE /api/initiatives/[id]` - Delete
- `POST /api/initiatives/[id]/upload` - File upload

#### OKRs
- `GET /api/okrs` - List by initiative
- `POST /api/okrs` - Create new
- `PUT /api/okrs/[id]` - Update progress
- `DELETE /api/okrs/[id]` - Delete

#### File Processing
- `POST /api/upload` - File upload
- `GET /api/files/[id]/status` - Processing status
- `GET /api/files/[id]/preview` - Data preview

### Component Architecture

#### Page Components
```
app/
├── dashboard/page.tsx - Main dashboard
├── manager-dashboard/page.tsx - Manager view
├── initiatives/page.tsx - Initiative list
├── initiatives/[id]/page.tsx - Initiative detail
├── okrs/page.tsx - OKR management
├── upload/page.tsx - File upload
└── stratix-assistant/page.tsx - AI assistant
```

#### Reusable Components
```
components/
├── ui/ - Radix UI components
├── dashboard/ - Dashboard widgets
├── forms/ - Form components
├── charts/ - Data visualization
└── stratix/ - AI assistant components
```

### Critical User Journeys to Test

#### 1. User Onboarding
1. User registration/invitation
2. Profile setup
3. Area assignment
4. First initiative creation

#### 2. Initiative Management
1. Create new initiative
2. Upload Excel file
3. Data validation and processing
4. View processed data
5. Update initiative status
6. Add OKRs to initiative

#### 3. Manager Workflow
1. Manager dashboard access
2. View team initiatives
3. Assign initiatives to team members
4. Review progress reports
5. Export analytics data

#### 4. File Processing Workflow
1. Upload Excel file
2. File validation
3. Data parsing and transformation
4. Error handling and reporting
5. Data import confirmation
6. Historical data tracking

### Environment-Specific Testing

#### Development Environment
- Local Supabase instance
- Mock external services
- Test data fixtures
- Development API keys

#### Staging Environment
- Production-like Supabase
- Real external service integration
- Sanitized production data
- Staging API keys

#### Production Environment
- Read-only testing
- Smoke tests only
- Monitoring and alerting
- Production API keys

### Security Testing Focus Areas

#### 1. Row Level Security (RLS)
```sql
-- Test tenant isolation
CREATE POLICY tenant_isolation ON initiatives
FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

#### 2. Role-based Permissions
- Admin: Full access
- Manager: Team area access
- User: Own initiatives only
- SuperAdmin: Cross-tenant access

#### 3. Data Validation
- File upload security
- SQL injection prevention
- XSS protection
- Input sanitization

### Performance Testing Targets

#### Page Load Times
- Dashboard: < 2 seconds
- Initiative list: < 3 seconds
- File upload: < 5 seconds
- Reports: < 10 seconds

#### Database Performance
- Initiative queries: < 500ms
- File processing: < 30 seconds
- Bulk operations: < 2 minutes
- Analytics queries: < 5 seconds

### Integration Points to Test

#### External Services
1. **Supabase Auth**: Authentication flows
2. **Google AI**: Stratix assistant responses
3. **Email Services**: Notifications and invites
4. **File Storage**: Upload and retrieval

#### Internal Services
1. **File Processing**: Excel parsing
2. **Data Validation**: Business rules
3. **Notification System**: Real-time updates
4. **Analytics**: Report generation

### Test Data Requirements

#### User Accounts
```typescript
// Test users for different scenarios
interface TestUser {
  email: string;
  role: UserRole;
  tenantId: string;
  areaId?: string;
}
```

#### Sample Data
- Initiatives: Various statuses and complexities
- OKRs: Different progress levels
- Files: Valid and invalid Excel formats
- Areas: Hierarchical organization structure

### Error Scenarios to Test

#### File Upload Errors
- Invalid file format
- File size too large
- Corrupted Excel files
- Network interruptions
- Processing timeouts

#### Database Errors
- Connection failures
- Constraint violations
- Transaction rollbacks
- Concurrent access issues

#### Authentication Errors
- Invalid credentials
- Expired tokens
- Permission denials
- Account lockouts

This context ensures the automation agent understands the specific requirements and constraints of your Initiative Dashboard application.
