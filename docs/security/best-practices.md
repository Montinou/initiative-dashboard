# Security Best Practices and Guidelines

## Overview

This document provides comprehensive security guidelines and best practices for developers, administrators, and users of the Initiative Dashboard. Following these practices ensures the security and integrity of the system.

## Development Security Guidelines

### 1. Authentication & Authorization

#### Always Use getUser() on Server-Side

```typescript
// ❌ WRONG - Session can be spoofed
const { data: { session } } = await supabase.auth.getSession()

// ✅ CORRECT - Verifies JWT signature
const { data: { user }, error } = await supabase.auth.getUser()
```

#### Implement Proper Permission Checks

```typescript
// Always check permissions before operations
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const { user, userProfile, error } = await authenticateRequest(request)
  if (error) return unauthorizedResponse()
  
  // 2. Authorize
  if (!hasPermission(userProfile.role, 'resource', 'action')) {
    return forbiddenResponse()
  }
  
  // 3. Validate tenant context
  if (data.tenant_id !== userProfile.tenant_id) {
    return forbiddenResponse('Cross-tenant access denied')
  }
  
  // 4. Proceed with operation
}
```

### 2. Input Validation & Sanitization

#### Validate All Inputs

```typescript
// Define strict validation schemas
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).regex(/^[a-zA-Z\s]+$/),
  age: z.number().min(0).max(150),
  url: z.string().url().optional(),
  date: z.string().datetime()
})

// Validate before processing
const result = schema.safeParse(input)
if (!result.success) {
  return { error: result.error.errors }
}
```

#### Sanitize User-Generated Content

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Sanitize HTML content
const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target']
})

// Escape special characters for display
function escapeHtml(text: string): string {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, m => map[m])
}
```

### 3. Database Security

#### Use Parameterized Queries

```typescript
// ✅ SAFE - Parameterized query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .eq('tenant_id', tenantId)

// ❌ DANGEROUS - SQL injection vulnerable
const query = `SELECT * FROM users WHERE id = '${userId}'`
```

#### Enable RLS on All Tables

```sql
-- Always enable and force RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_name FORCE ROW LEVEL SECURITY;

-- Create restrictive policies by default
CREATE POLICY "Default deny all" ON public.table_name
  FOR ALL USING (false);
```

### 4. Secret Management

#### Environment Variables

```typescript
// .env.local (never commit)
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=super-secret-key-here
ENCRYPTION_KEY=another-secret-key

// Access securely
const secret = process.env.JWT_SECRET
if (!secret) {
  throw new Error('JWT_SECRET not configured')
}
```

#### Key Rotation Strategy

```typescript
// Implement key rotation
interface KeyRotation {
  currentKey: string
  previousKey?: string
  rotatedAt: Date
  expiresAt: Date
}

// Support multiple keys during rotation
function verifyToken(token: string): boolean {
  try {
    // Try current key
    return jwt.verify(token, currentKey)
  } catch {
    // Try previous key during grace period
    if (previousKey && withinGracePeriod()) {
      return jwt.verify(token, previousKey)
    }
    return false
  }
}
```

### 5. Error Handling

#### Never Expose Sensitive Information

```typescript
// Production error handler
export function handleError(error: any): Response {
  // Log detailed error internally
  logger.error({
    error: error.message,
    stack: error.stack,
    timestamp: new Date(),
    context: getRequestContext()
  })
  
  // Return generic error to client
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'An error occurred',
      reference: generateErrorReference()
    }
  }
  
  // Development can show more details
  return {
    error: error.message,
    type: error.constructor.name
  }
}
```

### 6. Secure Communication

#### Always Use HTTPS

```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production' && !request.secure) {
  return redirect(`https://${request.host}${request.url}`)
}

// Set HSTS header
response.headers.set(
  'Strict-Transport-Security',
  'max-age=63072000; includeSubDomains; preload'
)
```

#### Implement CSP

```typescript
// Content Security Policy
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.trusted.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.trusted.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\n/g, ' ').trim()

response.headers.set('Content-Security-Policy', cspHeader)
```

## Operational Security

### 1. Access Control

#### Principle of Least Privilege

```typescript
// Grant minimal required permissions
const rolePermissions = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete'],
  owner: ['read', 'write', 'delete', 'admin']
}

// Temporary permission elevation
async function withElevatedPermissions<T>(
  userId: string,
  permissions: string[],
  operation: () => Promise<T>
): Promise<T> {
  await grantTemporaryPermissions(userId, permissions)
  try {
    return await operation()
  } finally {
    await revokeTemporaryPermissions(userId, permissions)
  }
}
```

### 2. Monitoring & Logging

#### Comprehensive Audit Logging

```typescript
// Log all security-relevant events
interface AuditLog {
  timestamp: Date
  userId: string
  action: string
  resource: string
  result: 'success' | 'failure'
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
}

async function auditLog(entry: AuditLog) {
  // Store in database
  await supabase.from('audit_logs').insert(entry)
  
  // Alert on suspicious activity
  if (await isSuspicious(entry)) {
    await alertSecurityTeam(entry)
  }
}
```

#### Security Metrics

```typescript
// Track security metrics
const securityMetrics = {
  failedLogins: new Counter('failed_login_attempts'),
  suspiciousActivities: new Counter('suspicious_activities'),
  dataBreaches: new Counter('data_breach_attempts'),
  vulnerabilitiesFound: new Gauge('vulnerabilities_found'),
  patchingStatus: new Gauge('systems_needing_patches')
}
```

### 3. Incident Response

#### Incident Response Plan

```typescript
interface IncidentResponse {
  detect: () => Promise<Incident[]>
  contain: (incident: Incident) => Promise<void>
  eradicate: (incident: Incident) => Promise<void>
  recover: (incident: Incident) => Promise<void>
  postmortem: (incident: Incident) => Promise<Report>
}

// Automated incident response
async function handleSecurityIncident(incident: Incident) {
  // 1. Immediate containment
  await blockSuspiciousIP(incident.sourceIP)
  await disableCompromisedAccounts(incident.affectedUsers)
  
  // 2. Alert security team
  await notifySecurityTeam(incident)
  
  // 3. Preserve evidence
  await captureForensicData(incident)
  
  // 4. Begin investigation
  await initiateInvestigation(incident)
}
```

### 4. Backup & Recovery

#### Regular Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/secure/backups"

# Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_$BACKUP_DATE.sql"

# Encrypt backup
gpg --encrypt --recipient security@example.com \
    "$BACKUP_DIR/db_$BACKUP_DATE.sql"

# Store in secure location
aws s3 cp "$BACKUP_DIR/db_$BACKUP_DATE.sql.gpg" \
    s3://secure-backups/ --server-side-encryption

# Verify backup integrity
verify_backup "$BACKUP_DIR/db_$BACKUP_DATE.sql.gpg"
```

## User Security Guidelines

### 1. Password Security

#### Strong Password Requirements

```typescript
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventPersonalInfo: true,
  requireRegularChange: 90, // days
  preventReuse: 5 // last 5 passwords
}

// Password strength meter
function calculatePasswordStrength(password: string): number {
  let strength = 0
  
  if (password.length >= 12) strength += 20
  if (password.length >= 16) strength += 20
  if (/[a-z]/.test(password)) strength += 20
  if (/[A-Z]/.test(password)) strength += 20
  if (/[0-9]/.test(password)) strength += 10
  if (/[^a-zA-Z0-9]/.test(password)) strength += 10
  
  // Check for common patterns
  if (!/(.)\1{2,}/.test(password)) strength += 10 // No repeating chars
  if (!/^[0-9]+$/.test(password)) strength += 10 // Not all numbers
  
  return Math.min(strength, 100)
}
```

### 2. Multi-Factor Authentication

#### MFA Implementation

```typescript
// Enforce MFA for sensitive operations
async function requireMFA(
  user: User,
  operation: string
): Promise<boolean> {
  // Check if operation requires MFA
  const requiresMFA = [
    'delete_organization',
    'change_role',
    'export_all_data',
    'modify_security_settings'
  ].includes(operation)
  
  if (!requiresMFA) return true
  
  // Check current authentication level
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  
  if (data.currentLevel !== 'aal2') {
    // Prompt for MFA
    throw new Error('MFA required for this operation')
  }
  
  return true
}
```

### 3. Session Security

#### Session Management

```typescript
// Secure session configuration
const sessionConfig = {
  duration: 60 * 60 * 8, // 8 hours
  inactivityTimeout: 60 * 15, // 15 minutes
  concurrent: false, // No concurrent sessions
  bindToIP: true, // Bind session to IP
  regenerateOnLogin: true,
  secureCookie: true,
  sameSite: 'strict'
}

// Monitor session activity
async function monitorSession(session: Session) {
  // Check for suspicious activity
  if (session.ipAddress !== session.originalIP) {
    await alertUser('Session accessed from new IP')
  }
  
  // Check for session hijacking
  if (await isSessionHijacked(session)) {
    await terminateSession(session)
    await alertUser('Suspicious session activity detected')
  }
}
```

## Security Testing

### 1. Automated Security Testing

```typescript
// Security test suite
describe('Security Tests', () => {
  test('SQL Injection Prevention', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM passwords--"
    ]
    
    for (const input of maliciousInputs) {
      const response = await api.post('/search', { query: input })
      expect(response.status).not.toBe(500)
      
      // Verify no damage done
      const tablesExist = await verifyTablesIntact()
      expect(tablesExist).toBe(true)
    }
  })
  
  test('XSS Prevention', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>'
    ]
    
    for (const payload of xssPayloads) {
      const response = await api.post('/comment', { text: payload })
      const stored = await api.get('/comments/latest')
      
      expect(stored.data.text).not.toContain('<script>')
      expect(stored.data.text).not.toContain('javascript:')
      expect(stored.data.text).not.toContain('onerror=')
    }
  })
})
```

### 2. Penetration Testing

```bash
# Regular penetration testing
# Using OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://app.example.com \
  -r security-report.html

# Using Burp Suite
burpsuite --project-file=app-security.burp \
  --config-file=scan-config.json

# Custom security scanning
npm run security:scan
```

## Security Checklist

### Daily
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Monitor rate limiting violations
- [ ] Review error logs for anomalies

### Weekly
- [ ] Review audit logs
- [ ] Check for unusual access patterns
- [ ] Verify backup integrity
- [ ] Review user permissions

### Monthly
- [ ] Security patches applied
- [ ] Dependency updates
- [ ] SSL certificate validity
- [ ] Access review
- [ ] Security training

### Quarterly
- [ ] Penetration testing
- [ ] Security audit
- [ ] Incident response drill
- [ ] Policy review
- [ ] Risk assessment

### Annually
- [ ] Full security assessment
- [ ] Compliance audit
- [ ] Disaster recovery test
- [ ] Security training refresh
- [ ] Policy updates

## Emergency Procedures

### Data Breach Response

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Stop ongoing breach

2. **Assessment**
   - Determine scope
   - Identify affected data
   - Document timeline

3. **Notification**
   - Internal stakeholders
   - Affected users
   - Regulatory bodies

4. **Remediation**
   - Fix vulnerabilities
   - Strengthen security
   - Update procedures

5. **Post-Incident**
   - Conduct postmortem
   - Update security measures
   - Train staff

### Contact Information

**Security Team**: security@example.com
**Incident Response**: incident@example.com
**24/7 Hotline**: +1-XXX-XXX-XXXX

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-16
**Classification**: Internal Use Only
**Review Cycle**: Quarterly