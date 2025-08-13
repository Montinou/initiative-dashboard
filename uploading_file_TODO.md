# File Upload System - Implementation TODO & Analysis Notes

## 📋 Task List

### Phase 1: Analysis & Documentation
- [x] Create initial TODO file structure
- [x] Analyze schema for all importable entities
- [x] Identify entity relationships and dependencies
- [x] Define required vs optional fields for each entity
- [x] Create comprehensive field mapping documentation
- [x] Document validation rules and constraints
- [x] Define error handling strategies

### Phase 2: Proposal Creation
- [x] Create data import field mapping proposal document
- [x] Define CSV/Excel template structures
- [x] Document entity import order requirements
- [x] Specify duplicate handling strategies
- [x] Define rollback mechanisms

### Phase 3: Implementation Planning
- [x] Design file upload API endpoints (70% existing)
- [x] Plan GCS integration (95% existing)
- [x] Define background job processing (80% existing)
- [ ] Create progress tracking system
- [ ] Design error reporting mechanism

### Phase 4: Implementation Execution - IN PROGRESS

#### Week 1: Core Functionality (High Priority)
- [ ] **Task 1.1**: Implement synchronous processing for ≤25 rows
  - [ ] Add row count check in upload endpoint
  - [ ] Create sync processing path
  - [ ] Return immediate results for small files
  - **Agent**: web-app-developer
  
- [ ] **Task 1.2**: Add missing field mappings
  - [ ] Objectives: start_date, end_date, priority, status, progress, metrics
  - [ ] Initiatives: start_date, due_date, progress, status
  - [ ] Activities: assigned_to, is_completed
  - **Agent**: database-architect + web-app-developer
  
- [ ] **Task 1.3**: Implement validation system
  - [ ] Email format validation
  - [ ] Date format and logic validation
  - [ ] Enum validations (status, priority, role)
  - [ ] Progress range validation (0-100)
  - **Agent**: web-app-developer
  
- [ ] **Task 1.4**: Add batch insert optimization
  - [ ] Replace row-by-row with batch inserts
  - [ ] Implement chunked transactions
  - [ ] Add connection pooling
  - **Agent**: database-architect

#### Week 2: User Experience
- [ ] **Task 2.1**: Create template generation system
- [ ] **Task 2.2**: Add progress tracking UI
- [ ] **Task 2.3**: Implement i18n error messages
- [ ] **Task 2.4**: Add import preview feature

#### Week 3: Extended Entities
- [ ] **Task 3.1**: Implement user profile import
- [ ] **Task 3.2**: Implement area import
- [ ] **Task 3.3**: Add duplicate handling
- [ ] **Task 3.4**: Create rollback mechanism

#### Week 4: Polish & Security
- [ ] **Task 4.1**: Add virus scanning
- [ ] **Task 4.2**: Implement rate limiting
- [ ] **Task 4.3**: Add audit logging
- [ ] **Task 4.4**: Performance testing

## 📊 Analysis Notes

### Import System Tables (Existing)
- **okr_import_jobs**: Tracks overall import operations
- **okr_import_job_items**: Tracks individual row processing

### Importable Entities (Priority Order)
1. **Areas** - Organizational units (must exist before initiatives)
2. **User Profiles** - Users who will be assigned to areas/activities
3. **Objectives** - Strategic goals
4. **Initiatives** - Tactical projects linked to objectives
5. **Activities** - Granular tasks within initiatives
6. **Objective-Initiative Links** - Many-to-many relationships

### Key Constraints to Consider
- Tenant isolation (all data must belong to a tenant)
- Foreign key relationships (proper import order)
- Role-based permissions (who can import what)
- Data validation (email formats, date ranges, etc.)

## 🔍 Detailed Entity Analysis

### Areas Entity
**Purpose**: Define organizational departments/units
**Dependencies**: tenant_id, manager_id (user_profile)
**Import Order**: 2nd (after user_profiles if managers are specified)

### User Profiles Entity
**Purpose**: System users with roles and assignments
**Dependencies**: tenant_id, area_id (optional)
**Import Order**: 1st (base entity)

### Objectives Entity
**Purpose**: Strategic goals with time bounds
**Dependencies**: tenant_id, area_id, created_by
**Import Order**: 3rd (after areas and users)

### Initiatives Entity
**Purpose**: Projects to achieve objectives
**Dependencies**: tenant_id, area_id, created_by
**Import Order**: 4th (after objectives)

### Activities Entity
**Purpose**: Tasks within initiatives
**Dependencies**: initiative_id, assigned_to
**Import Order**: 5th (after initiatives)

## 📝 Field Mapping Progress

### Completed Analyses
- [x] Areas field mapping
- [x] User Profiles field mapping
- [x] Objectives field mapping
- [x] Initiatives field mapping
- [x] Activities field mapping

### Validation Rules Documented
- [x] Email validation patterns
- [x] Date range validations
- [x] Status enum validations
- [x] Progress percentage validations
- [x] Role validations

## 🚀 Next Steps
1. ~~Complete detailed field analysis for each entity~~ ✅
2. ~~Create comprehensive proposal document~~ ✅
3. ~~Design CSV/Excel templates~~ ✅
4. Plan implementation phases - IN PROGRESS
5. Create API endpoints for file upload
6. Implement GCS integration
7. Build background job processor

# Analysis Notes

## Key Findings from Schema Analysis

### 1. Import Complexity Levels
- **Simple Entities**: Areas, User Profiles (minimal dependencies)
- **Medium Complexity**: Objectives (requires areas, users)
- **High Complexity**: Initiatives, Activities (multiple dependencies)
- **Relationship Tables**: objective_initiatives (requires both entities to exist)

### 2. Critical Design Decisions

#### Import Order Strategy
Must follow strict order to maintain referential integrity:
1. User Profiles first (base entity, no dependencies except tenant)
2. Areas second (can reference manager from user_profiles)
3. Objectives third (references areas and created_by user)
4. Initiatives fourth (references areas, created_by, and optionally objectives)
5. Activities last (references initiatives and assigned_to user)

#### Lookup Strategy
Using text-based lookups in CSV for user-friendliness:
- Areas: Lookup by name (unique per tenant)
- Users: Lookup by email (unique globally)
- Objectives/Initiatives: Lookup by title (should be unique per tenant)

#### Duplicate Handling
- **User Profiles**: Update existing if email matches
- **Areas**: Update existing if name matches
- **Objectives/Initiatives**: Create new (titles may legitimately duplicate)
- **Activities**: Always create new

### 3. Required Fields Analysis

#### Absolute Minimum Required Fields
- **User Profiles**: email, role, full_name
- **Areas**: name only
- **Objectives**: title, start_date
- **Initiatives**: title, area_name
- **Activities**: title, initiative_title

#### Why These Are Required
- Email: Unique identifier for users, needed for authentication
- Role: Determines permissions, critical for system security
- Names/Titles: Primary identifiers for entities
- Start dates: Required for time-based planning
- Foreign keys: Maintain referential integrity

### 4. Optional Fields Strategy

#### Smart Defaults Applied
- `is_active`: Default to true (assume active unless specified)
- `progress`: Default to 0 (start at beginning)
- `status`: Default to planning/in_progress based on entity type
- `created_at/updated_at`: Use current timestamp
- `tenant_id`: Always from session context (security requirement)

#### Fields That Should Remain Optional
- Descriptions: Not all items need detailed descriptions
- End dates: Some objectives are ongoing
- Assignments: Not all activities are assigned immediately
- Metrics: Can be added later as objectives mature

### 5. Data Validation Insights

#### Critical Validations
- **Email Format**: Regex validation to prevent auth issues
- **Date Logic**: start_date must be <= end_date
- **Progress Range**: 0-100 integer only
- **Enum Values**: Strict validation to prevent database errors
- **Foreign Keys**: Must exist or import fails

#### Warning-Level Validations
- Future due dates (might be intentional)
- Unassigned activities (might be intentional)
- 0% progress with completed status (needs review)

### 6. Security Considerations

#### Tenant Isolation
- All imports MUST be scoped to user's tenant
- No cross-tenant references allowed
- Tenant ID never exposed in CSV

#### Permission Checks
- Only CEO/Admin can import all entity types
- Managers can only import within their area
- Regular users cannot import

### 7. Performance Optimizations

#### Batch Processing
- Parse entire file first, validate all rows
- Batch database inserts (100 rows at a time)
- Use transactions for atomicity
- Background jobs for large files (>1000 rows)

#### Caching Strategy
- Cache user email->ID mappings during import
- Cache area name->ID mappings during import
- Reduces database lookups significantly

### 8. Error Recovery

#### Partial Success Handling
- Track each row's success/failure
- Allow continuing on non-critical errors
- Provide detailed error report
- Option to retry failed rows only

#### Rollback Capabilities
- Full rollback on critical errors
- Partial rollback for specific entities
- Audit trail for all imports
- Undo functionality within 24 hours

### 9. File Format Considerations

#### CSV vs Excel
- **CSV**: Simpler, one entity type per file
- **Excel**: Multiple sheets, better for related data
- Both supported with same validation logic

#### Template Generation
- Provide downloadable templates
- Include example data
- Embed validation rules in Excel
- Include dropdown lists for enums

### 10. Integration Points

#### With Existing Systems
- **okr_import_jobs**: Track import status
- **okr_import_job_items**: Track row-level status
- **audit_log**: Record all import operations
- **progress_history**: Update when importing progress

#### With File Storage
- Use GCS for file storage (already configured)
- Generate signed URLs for downloads
- Implement virus scanning
- Archive imports for compliance


---
*Last Updated: 2025-01-14*
*Status: Analysis Phase Complete - Ready for Implementation*

## Summary of Deliverables
1. ✅ **Comprehensive Field Mapping Document**: `/docs/proposals/okr-data-import-field-mapping.md` (v1.2)
   - Complete specification of all required and optional fields
   - Database field mappings for all entities
   - Validation rules and constraints
   - Import order requirements
   - Template specifications
   - **v1.1**: Synchronous (≤50 rows) vs Asynchronous (>50 rows) processing modes
   - **v1.2**: Reduced threshold to 25 rows, added i18n translation implementation
   - Separate response formats for each processing mode
   - API endpoint specifications
   - Translation keys for all error messages

2. ✅ **Detailed Analysis Notes**: Documented above
   - Import complexity assessment
   - Security considerations
   - Performance optimization strategies
   - Error handling approaches
   - Integration points with existing systems

## Latest Updates (2025-01-14)
- Added automatic processing mode selection based on row count
- **UPDATED**: Changed threshold from 50 to 25 rows for sync/async decision
- Created separate flow diagrams for each processing mode
- Specified different response formats for immediate vs background processing
- Added progress tracking API for async jobs
- **NEW**: Added i18n translation keys for all error and warning messages
- **NEW**: Specified translation parameter structure for dynamic values