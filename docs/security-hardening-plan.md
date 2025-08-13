# Security Hardening Plan for OKR Import System

## Executive Summary

This document outlines the security hardening plan for the OKR Import System, detailing the current pragmatic implementation state and the migration path to production-grade security. Since the system currently has no active users, we've prioritized feature completeness with service role access, while documenting the comprehensive security migration required for production deployment.

## Current State (Development Phase - No Active Users)

### Service Role Usage
- **Status**: Using `SUPABASE_SERVICE_ROLE_KEY` for all database operations
- **Reason**: Simplifies development and testing without user authentication
- **Risk Level**: Acceptable for development with no active users
- **Scope**: All import operations bypass RLS

### Transaction Support
- **Status**: ✅ Implemented via `TransactionManager` class
- **Coverage**: All multi-entity operations wrapped in transactions
- **Rollback**: Automatic on failure with retry logic
- **Isolation Level**: `read_committed` by default

### Current Security Measures
1. **File validation**: Basic content-type checking
2. **Input sanitization**: SQL injection prevention via parameterized queries
3. **Error handling**: Generic error messages (no stack traces exposed)
4. **File storage**: GCS with signed URLs (time-limited access)

## Migration Path to Production Security

### Phase 1: Pre-Production Hardening (Before First User)

#### 1.1 Replace Service Role with User Context
```typescript
// Current (Service Role)
const serviceClient = createServiceClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Target (User Context)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const userProfile = await getUserProfile(supabase, user.id);
```

#### 1.2 Implement Proper RLS Queries
```sql
-- Enable RLS enforcement
ALTER TABLE okr_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_import_job_items ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY "Users can manage own tenant imports"
ON okr_import_jobs
FOR ALL
USING (tenant_id = auth.jwt() ->> 'tenant_id')
WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');
```

#### 1.3 Add File Type Validation
```typescript
// Magic number validation
const FILE_SIGNATURES = {
  csv: [0x22, 0x2C], // CSV files often start with quotes
  xlsx: [0x50, 0x4B], // ZIP archive (Excel files)
  xls: [0xD0, 0xCF]   // OLE2 compound document
};

function validateFileType(buffer: Buffer, expectedType: string): boolean {
  const signature = buffer.slice(0, 2);
  return FILE_SIGNATURES[expectedType]?.every((byte, i) => signature[i] === byte);
}
```

### Phase 2: Security Enhancements

#### 2.1 Rate Limiting
```typescript
// Implement rate limiting middleware
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 imports per window
  skipSuccessfulRequests: false
};

// Per-tenant limits
const tenantLimits = new Map<string, RateLimitInfo>();
```

#### 2.2 Virus Scanning Integration
```typescript
// ClamAV integration for file scanning
interface VirusScanResult {
  clean: boolean;
  virus?: string;
  scanTime: number;
}

async function scanFile(buffer: Buffer): Promise<VirusScanResult> {
  // Integrate with ClamAV or cloud scanning service
  const scanner = new ClamAVScanner();
  return await scanner.scan(buffer);
}
```

#### 2.3 Input Sanitization Enhancement
```typescript
// Enhanced sanitization for all user inputs
class InputSanitizer {
  sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
      .replace(/[<>]/g, '') // Remove potential XSS
      .substring(0, 255);    // Enforce length limit
  }

  sanitizeText(text: string): string {
    return text
      .replace(/[<>'"]/g, '') // Remove potential XSS/SQL injection
      .trim()
      .substring(0, 1000);
  }

  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Safe characters only
      .substring(0, 255);
  }
}
```

### Phase 3: Production Deployment Requirements

#### 3.1 Authentication & Authorization Matrix

| Action | CEO | Admin | Manager | Required Checks |
|--------|-----|-------|---------|-----------------|
| Import OKRs | ✅ | ✅ | ❌ | Tenant match, Role check |
| Import Users | ✅ | ✅ | ❌ | Tenant match, Admin role |
| Import Areas | ✅ | ✅ | ❌ | Tenant match, Admin role |
| View Import History | ✅ | ✅ | Own area only | Tenant match, Area filter |
| Download Templates | ✅ | ✅ | ✅ | Authenticated user |

#### 3.2 Audit Trail Requirements
```typescript
interface ImportAuditEntry {
  id: string;
  user_id: string;
  tenant_id: string;
  action: 'import_started' | 'import_completed' | 'import_failed';
  entity_type: 'okr' | 'user' | 'area';
  metadata: {
    filename: string;
    row_count: number;
    success_count: number;
    error_count: number;
    ip_address: string;
    user_agent: string;
  };
  timestamp: Date;
}
```

#### 3.3 Performance Impact Mitigation

**Current Performance (Service Role)**:
- Database round-trips: Direct access
- Query complexity: Simple
- Latency: ~50ms per operation

**Expected Performance (With RLS)**:
- Database round-trips: +1 for auth check
- Query complexity: JOIN with user_profiles
- Latency: ~75-100ms per operation

**Optimization Strategies**:
1. **Connection Pooling**: Maintain 10 persistent connections
2. **Query Optimization**: Pre-compile RLS checks
3. **Caching**: Redis for frequent lookups
4. **Batch Operations**: Process 100 rows at once

### Phase 4: Monitoring & Alerting

#### 4.1 Security Metrics to Track
```typescript
const securityMetrics = {
  failedImports: new Counter('import_failures_total'),
  suspiciousFiles: new Counter('suspicious_files_detected'),
  rateLimitHits: new Counter('rate_limit_violations'),
  unauthorizedAccess: new Counter('unauthorized_attempts'),
  largeFileUploads: new Histogram('file_size_bytes'),
  processingTime: new Histogram('import_duration_seconds')
};
```

#### 4.2 Alert Thresholds
- Failed imports > 10 in 5 minutes
- Suspicious file detected (virus/malware)
- Rate limit exceeded by same user
- Unauthorized access attempts > 3
- File size > 100MB
- Processing time > 5 minutes

### Phase 5: Disaster Recovery

#### 5.1 Rollback Procedures
```sql
-- Transaction rollback for failed imports
BEGIN;
SAVEPOINT import_start;
-- Import operations
ROLLBACK TO SAVEPOINT import_start; -- On failure
COMMIT; -- On success

-- Full job rollback
DELETE FROM okr_import_job_items WHERE job_id = $1;
DELETE FROM okr_import_jobs WHERE id = $1;
```

#### 5.2 Data Recovery
- Maintain import history for 90 days
- Soft delete with recovery window
- Backup before bulk operations
- Transaction logs for audit

## Implementation Timeline

### Immediate (Before MVP)
- [x] Transaction support
- [x] Basic input validation
- [x] Error handling
- [ ] Replace service role in non-critical paths

### Week 1 (First Users)
- [ ] Full RLS implementation
- [ ] Rate limiting
- [ ] Enhanced input sanitization
- [ ] File type validation

### Week 2-3 (Production Ready)
- [ ] Virus scanning
- [ ] Complete audit trail
- [ ] Security monitoring
- [ ] Performance optimization

### Month 1 (Scale Ready)
- [ ] Advanced threat detection
- [ ] Machine learning for anomaly detection
- [ ] Distributed processing
- [ ] Multi-region support

## Security Checklist

### Pre-Deployment
- [ ] Remove all service role usage
- [ ] Enable RLS on all tables
- [ ] Implement rate limiting
- [ ] Add virus scanning
- [ ] Set up monitoring alerts
- [ ] Security audit by third party
- [ ] Penetration testing
- [ ] Load testing with RLS

### Post-Deployment
- [ ] Monitor security metrics
- [ ] Regular security audits
- [ ] Update dependencies
- [ ] Review access logs
- [ ] Incident response drills

## Code Migration Examples

### Example 1: Migrating Objective Creation

**Current (Service Role)**:
```typescript
const { data, error } = await serviceClient
  .from('objectives')
  .insert(objectiveData);
```

**Target (With RLS)**:
```typescript
// Get authenticated user context
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Verify user permissions
const userProfile = await getUserProfile(supabase, user.id);
if (!['CEO', 'Admin'].includes(userProfile.role)) {
  throw new Error('Insufficient permissions');
}

// Insert with automatic tenant filtering via RLS
const { data, error } = await supabase
  .from('objectives')
  .insert({
    ...objectiveData,
    tenant_id: userProfile.tenant_id,
    created_by: userProfile.id
  });
```

### Example 2: Migrating Bulk Operations

**Current (Service Role)**:
```typescript
const { data } = await serviceClient.rpc('bulk_upsert_users', {
  p_tenant_id: tenantId,
  p_users: users
});
```

**Target (With RLS)**:
```typescript
// Verify admin permissions
const isAdmin = await verifyAdminRole(supabase, user.id);
if (!isAdmin) throw new Error('Admin access required');

// Execute with user context
const { data } = await supabase.rpc('bulk_upsert_users_secure', {
  p_users: users // tenant_id automatically from auth context
});
```

## Testing Strategy

### Security Testing Requirements
1. **Unit Tests**: Mock RLS policies
2. **Integration Tests**: Test with real auth
3. **Penetration Tests**: Attempt bypass scenarios
4. **Load Tests**: Performance with RLS
5. **Chaos Tests**: Failure recovery

### Test Scenarios
- Cross-tenant data access attempts
- SQL injection attempts
- File upload exploits
- Rate limit bypass attempts
- Malformed data handling
- Concurrent import conflicts

## Conclusion

The current implementation prioritizes rapid development with pragmatic security decisions appropriate for a system with no active users. The migration path provides a clear roadmap to production-grade security when users are onboarded. Transaction support ensures data integrity even in the current state, while the comprehensive hardening plan addresses all identified vulnerabilities for production deployment.

**Key Principle**: Security measures should scale with risk. With no users, feature completeness takes priority. As users are added, security hardens proportionally.

## Appendix: Security Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP File Upload Security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [ClamAV Integration Guide](https://www.clamav.net/documents/introduction)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)