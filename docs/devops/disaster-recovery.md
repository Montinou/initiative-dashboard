# Disaster Recovery and Business Continuity Plan

## Overview

This document outlines the disaster recovery (DR) and business continuity procedures for the Initiative Dashboard application, ensuring minimal downtime and data loss in case of failures.

## Recovery Objectives

### Key Metrics
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Maximum Tolerable Downtime (MTD)**: 24 hours
- **Service Level Agreement (SLA)**: 99.9% uptime

## Disaster Scenarios

### Severity Levels

| Level | Description | RTO | RPO | Examples |
|-------|------------|-----|-----|----------|
| Critical (P1) | Complete system failure | 1 hour | 15 min | Database corruption, complete outage |
| High (P2) | Major functionality impaired | 4 hours | 1 hour | Auth service down, API failures |
| Medium (P3) | Partial functionality impaired | 8 hours | 4 hours | Performance degradation, partial outage |
| Low (P4) | Minor issues | 24 hours | 24 hours | UI glitches, non-critical features |

## Backup Strategy

### Database Backups

#### Automated Backup Schedule
```sql
-- Supabase automatic backups (configured in dashboard)
-- Daily backups: 02:00 UTC
-- Weekly backups: Sunday 03:00 UTC
-- Monthly backups: 1st of month 04:00 UTC

-- Manual backup script
CREATE OR REPLACE FUNCTION backup_database()
RETURNS void AS $$
BEGIN
  -- Create backup with timestamp
  EXECUTE format('
    COPY (
      SELECT * FROM pg_dump_export()
    ) TO ''/backups/backup_%s.sql''',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS')
  );
END;
$$ LANGUAGE plpgsql;
```

#### Backup Verification Script
```bash
#!/bin/bash
# scripts/verify-backup.sh

set -e

BACKUP_FILE=$1
TEST_DB="test_restore_$(date +%s)"

echo "🔍 Verifying backup: $BACKUP_FILE"

# Create test database
createdb $TEST_DB

# Restore backup
pg_restore -d $TEST_DB $BACKUP_FILE

# Run verification queries
psql -d $TEST_DB -c "SELECT COUNT(*) FROM organizations;"
psql -d $TEST_DB -c "SELECT COUNT(*) FROM initiatives;"
psql -d $TEST_DB -c "SELECT COUNT(*) FROM user_profiles;"

# Check data integrity
psql -d $TEST_DB -c "
  SELECT 
    (SELECT COUNT(*) FROM initiatives WHERE tenant_id IS NULL) as orphaned_initiatives,
    (SELECT COUNT(*) FROM activities WHERE initiative_id NOT IN (SELECT id FROM initiatives)) as orphaned_activities,
    (SELECT COUNT(*) FROM user_profiles WHERE tenant_id IS NULL) as orphaned_users;
"

# Clean up
dropdb $TEST_DB

echo "✅ Backup verification completed successfully"
```

### Application Backups

#### Code Repository Backup
```yaml
# .github/workflows/backup.yml
name: Repository Backup

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Get full history
      
      - name: Create backup bundle
        run: |
          git bundle create repo-backup.bundle --all
          tar -czf backup-$(date +%Y%m%d).tar.gz repo-backup.bundle
      
      - name: Upload to backup storage
        uses: google-github-actions/upload-cloud-storage@v2
        with:
          path: backup-*.tar.gz
          destination: initiative-dashboard-backups/code
          credentials: ${{ secrets.GCP_CREDENTIALS }}
      
      - name: Clean old backups
        run: |
          gsutil ls gs://initiative-dashboard-backups/code/ | \
          head -n -30 | \
          xargs -I {} gsutil rm {}
```

#### Environment Configuration Backup
```typescript
// scripts/backup-config.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';
import crypto from 'crypto';

async function backupSecrets() {
  const client = new SecretManagerServiceClient();
  const projectId = process.env.GCP_PROJECT_ID;
  
  // List all secrets
  const [secrets] = await client.listSecrets({
    parent: `projects/${projectId}`,
  });

  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    secrets: [],
  };

  for (const secret of secrets) {
    const [version] = await client.accessSecretVersion({
      name: `${secret.name}/versions/latest`,
    });

    backup.secrets.push({
      name: secret.name,
      value: version.payload.data.toString('base64'),
      created: secret.createTime,
      labels: secret.labels,
    });
  }

  // Encrypt backup
  const password = process.env.BACKUP_ENCRYPTION_KEY;
  const encrypted = encrypt(JSON.stringify(backup), password);
  
  // Save encrypted backup
  const filename = `secrets-backup-${Date.now()}.enc`;
  fs.writeFileSync(filename, encrypted);
  
  // Upload to secure storage
  await uploadToSecureStorage(filename);
  
  console.log(`✅ Secrets backed up to ${filename}`);
}

function encrypt(text: string, password: string): string {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted,
  });
}
```

## Recovery Procedures

### Database Recovery

#### Point-in-Time Recovery
```sql
-- Restore to specific point in time
BEGIN;
  -- Stop all connections
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'production_db' AND pid <> pg_backend_pid();

  -- Restore from backup
  RESTORE DATABASE production_db 
  FROM '/backups/latest.backup'
  WITH RECOVERY TARGET TIME '2025-01-15 10:30:00';
  
  -- Verify restoration
  SELECT COUNT(*) FROM initiatives WHERE created_at > '2025-01-15 10:30:00';
COMMIT;
```

#### Incremental Recovery
```bash
#!/bin/bash
# scripts/incremental-recovery.sh

set -e

BACKUP_DIR="/backups"
RECOVERY_POINT=$1

echo "🔄 Starting incremental recovery to $RECOVERY_POINT"

# Find base backup
BASE_BACKUP=$(ls -t $BACKUP_DIR/full_*.backup | head -1)
echo "Using base backup: $BASE_BACKUP"

# Restore base backup
pg_restore -d temp_restore $BASE_BACKUP

# Apply WAL logs up to recovery point
for WAL in $(ls $BACKUP_DIR/wal_*.log | sort); do
  WAL_TIME=$(echo $WAL | grep -oP '\d{10}')
  if [ $WAL_TIME -le $RECOVERY_POINT ]; then
    echo "Applying WAL: $WAL"
    pg_waldump $WAL | psql -d temp_restore
  fi
done

echo "✅ Incremental recovery completed"
```

### Application Recovery

#### Rollback Procedure
```typescript
// scripts/rollback.ts
import { execSync } from 'child_process';

interface RollbackOptions {
  version?: string;
  deploymentId?: string;
  environment: 'production' | 'staging';
}

async function rollback(options: RollbackOptions) {
  console.log('🔄 Starting rollback procedure...');
  
  try {
    // Step 1: Identify target deployment
    const target = options.deploymentId || 
      await getDeploymentByVersion(options.version) ||
      await getLastStableDeployment();
    
    console.log(`Target deployment: ${target}`);
    
    // Step 2: Health check current state
    const currentHealth = await checkHealth();
    console.log(`Current health: ${currentHealth.status}`);
    
    // Step 3: Create database backup
    console.log('Creating safety backup...');
    await createBackup('pre-rollback');
    
    // Step 4: Perform rollback
    console.log('Rolling back to previous version...');
    if (options.environment === 'production') {
      execSync(`vercel promote ${target} --scope=${process.env.VERCEL_ORG_ID}`);
    } else {
      execSync(`vercel alias ${target} staging.siga-turismo.vercel.app`);
    }
    
    // Step 5: Wait for deployment
    await waitForDeployment(target);
    
    // Step 6: Verify rollback
    const newHealth = await checkHealth();
    if (newHealth.status !== 'healthy') {
      throw new Error('Rollback failed - system unhealthy');
    }
    
    // Step 7: Run smoke tests
    console.log('Running smoke tests...');
    execSync('npm run test:smoke');
    
    console.log('✅ Rollback completed successfully');
    
    // Step 8: Notify team
    await notifyTeam({
      event: 'rollback_success',
      target,
      environment: options.environment,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    
    // Emergency recovery
    await emergencyRecovery();
    
    // Alert team
    await alertTeam({
      event: 'rollback_failed',
      error: error.message,
      severity: 'critical',
    });
    
    throw error;
  }
}

async function emergencyRecovery() {
  console.log('🚨 Initiating emergency recovery...');
  
  // Switch to maintenance mode
  await enableMaintenanceMode();
  
  // Restore last known good configuration
  const lastGoodConfig = await getLastGoodConfiguration();
  await applyConfiguration(lastGoodConfig);
  
  // Restore database to last consistent state
  await restoreDatabase('last-consistent');
  
  // Clear all caches
  await clearAllCaches();
  
  // Restart services
  await restartServices();
  
  console.log('Emergency recovery completed');
}
```

## Failover Procedures

### Database Failover
```typescript
// lib/database-failover.ts
export class DatabaseFailover {
  private primaryUrl: string;
  private replicaUrls: string[];
  private currentUrl: string;
  private healthCheckInterval: NodeJS.Timer;

  constructor() {
    this.primaryUrl = process.env.DATABASE_URL;
    this.replicaUrls = process.env.DATABASE_REPLICAS?.split(',') || [];
    this.currentUrl = this.primaryUrl;
    this.startHealthChecks();
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      const isPrimaryHealthy = await this.checkDatabaseHealth(this.primaryUrl);
      
      if (!isPrimaryHealthy && this.currentUrl === this.primaryUrl) {
        await this.failover();
      } else if (isPrimaryHealthy && this.currentUrl !== this.primaryUrl) {
        await this.failback();
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkDatabaseHealth(url: string): Promise<boolean> {
    try {
      const client = new Client({ connectionString: url });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      return false;
    }
  }

  private async failover() {
    console.error('🚨 Primary database failure detected, initiating failover...');
    
    for (const replicaUrl of this.replicaUrls) {
      if (await this.checkDatabaseHealth(replicaUrl)) {
        this.currentUrl = replicaUrl;
        process.env.DATABASE_URL = replicaUrl;
        
        console.log(`✅ Failover successful to replica: ${replicaUrl}`);
        
        // Notify operations team
        await this.notifyOps({
          event: 'database_failover',
          from: this.primaryUrl,
          to: replicaUrl,
          timestamp: new Date().toISOString(),
        });
        
        return;
      }
    }
    
    throw new Error('All database replicas are unavailable');
  }

  private async failback() {
    console.log('🔄 Primary database recovered, initiating failback...');
    
    this.currentUrl = this.primaryUrl;
    process.env.DATABASE_URL = this.primaryUrl;
    
    console.log('✅ Failback to primary database successful');
    
    await this.notifyOps({
      event: 'database_failback',
      to: this.primaryUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private async notifyOps(details: any) {
    // Send notification to operations team
    await fetch(process.env.OPS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
  }
}
```

### Service Failover
```yaml
# docker-compose.failover.yml
version: '3.8'

services:
  app_primary:
    image: initiative-dashboard:latest
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  app_standby:
    image: initiative-dashboard:latest
    ports:
      - "3001:3000"
    environment:
      - STANDBY_MODE=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  haproxy:
    image: haproxy:alpine
    ports:
      - "80:80"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
    depends_on:
      - app_primary
      - app_standby
```

## Incident Response

### Incident Response Plan
```typescript
// lib/incident-response.ts
export class IncidentResponse {
  async handleIncident(incident: {
    severity: 'P1' | 'P2' | 'P3' | 'P4';
    type: string;
    description: string;
    affectedServices: string[];
  }) {
    const incidentId = this.generateIncidentId();
    const startTime = new Date();
    
    console.log(`🚨 Incident ${incidentId} declared: ${incident.description}`);
    
    // Step 1: Initial assessment
    const assessment = await this.assessImpact(incident);
    
    // Step 2: Notify stakeholders
    await this.notifyStakeholders(incident, assessment);
    
    // Step 3: Create incident channel
    const channel = await this.createIncidentChannel(incidentId);
    
    // Step 4: Execute response playbook
    const playbook = this.getPlaybook(incident.type);
    const result = await this.executePlaybook(playbook, incident);
    
    // Step 5: Monitor resolution
    await this.monitorResolution(incidentId, result);
    
    // Step 6: Post-incident review
    const endTime = new Date();
    await this.schedulePostMortem({
      incidentId,
      duration: endTime.getTime() - startTime.getTime(),
      severity: incident.severity,
      resolution: result,
    });
    
    return {
      incidentId,
      status: 'resolved',
      duration: endTime.getTime() - startTime.getTime(),
      actions: result.actions,
    };
  }

  private getPlaybook(incidentType: string): Playbook {
    const playbooks = {
      'database_failure': {
        steps: [
          { action: 'check_database_health', timeout: 60 },
          { action: 'attempt_reconnect', timeout: 120 },
          { action: 'failover_to_replica', timeout: 180 },
          { action: 'verify_data_integrity', timeout: 300 },
        ],
      },
      'api_degradation': {
        steps: [
          { action: 'check_api_health', timeout: 60 },
          { action: 'scale_up_instances', timeout: 120 },
          { action: 'clear_cache', timeout: 60 },
          { action: 'enable_rate_limiting', timeout: 60 },
        ],
      },
      'security_breach': {
        steps: [
          { action: 'isolate_affected_systems', timeout: 60 },
          { action: 'revoke_compromised_credentials', timeout: 120 },
          { action: 'enable_emergency_access_controls', timeout: 60 },
          { action: 'initiate_forensic_analysis', timeout: 300 },
        ],
      },
    };
    
    return playbooks[incidentType] || playbooks['generic'];
  }

  private async executePlaybook(playbook: Playbook, incident: any) {
    const results = {
      actions: [],
      success: true,
    };
    
    for (const step of playbook.steps) {
      try {
        console.log(`Executing: ${step.action}`);
        const result = await this.executeAction(step.action, incident);
        results.actions.push({
          action: step.action,
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to execute ${step.action}:`, error);
        results.success = false;
        results.actions.push({
          action: step.action,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return results;
  }

  private generateIncidentId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Communication Plan
```yaml
# incident-communication.yaml
communication_plan:
  P1_critical:
    immediate:
      - on_call_engineer
      - infrastructure_team_lead
      - cto
    within_15_minutes:
      - engineering_team
      - product_owner
      - customer_success_lead
    within_30_minutes:
      - ceo
      - all_customers # via status page
    updates_every: 30_minutes
    
  P2_high:
    immediate:
      - on_call_engineer
      - infrastructure_team_lead
    within_30_minutes:
      - engineering_team
      - product_owner
    within_1_hour:
      - affected_customers
    updates_every: 1_hour
    
  P3_medium:
    immediate:
      - on_call_engineer
    within_1_hour:
      - engineering_team
    updates_every: 2_hours
    
  P4_low:
    within_24_hours:
      - engineering_team
    updates_every: daily

channels:
  internal:
    slack: "#incidents"
    pagerduty: true
    email: incidents@company.com
    
  external:
    status_page: https://status.siga-turismo.com
    twitter: "@SigaStatus"
    email: customers@company.com
```

## Testing and Validation

### Disaster Recovery Testing
```typescript
// scripts/dr-test.ts
import { DRTestRunner } from './lib/dr-test-runner';

async function runDRTest() {
  const runner = new DRTestRunner();
  
  const tests = [
    {
      name: 'Database Backup and Restore',
      test: async () => {
        // Create test data
        const testData = await createTestData();
        
        // Trigger backup
        await triggerBackup();
        
        // Simulate failure
        await simulateDatabaseFailure();
        
        // Restore from backup
        await restoreFromBackup();
        
        // Verify data integrity
        const restoredData = await getTestData();
        assert.deepEqual(testData, restoredData);
      },
    },
    {
      name: 'Application Rollback',
      test: async () => {
        // Deploy new version
        const newVersion = await deployVersion('v2.0.0');
        
        // Simulate issues
        await simulateApplicationError();
        
        // Trigger rollback
        await rollback('v1.9.0');
        
        // Verify rollback
        const currentVersion = await getCurrentVersion();
        assert.equal(currentVersion, 'v1.9.0');
      },
    },
    {
      name: 'Failover to Replica',
      test: async () => {
        // Verify primary is active
        const primaryStatus = await checkPrimaryDatabase();
        assert.equal(primaryStatus, 'active');
        
        // Simulate primary failure
        await simulatePrimaryFailure();
        
        // Wait for automatic failover
        await sleep(60000);
        
        // Verify replica is now active
        const replicaStatus = await checkReplicaStatus();
        assert.equal(replicaStatus, 'active');
        
        // Verify data availability
        const data = await queryDatabase();
        assert.ok(data);
      },
    },
  ];
  
  const results = await runner.runTests(tests);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results,
  };
  
  console.log('DR Test Report:', report);
  
  // Save report
  await saveReport(report);
  
  return report;
}

// Schedule quarterly DR tests
schedule.scheduleJob('0 0 1 */3 *', runDRTest);
```

## Documentation and Runbooks

### Recovery Runbooks
```markdown
# Database Recovery Runbook

## Prerequisites
- Access to backup storage
- Database admin credentials
- Recovery environment prepared

## Steps

### 1. Assess the Situation
```bash
# Check database status
psql -h $DB_HOST -U $DB_USER -c "SELECT version();"

# Check last successful backup
gsutil ls gs://backups/database/ | tail -5

# Identify recovery point
echo "Enter recovery timestamp (YYYY-MM-DD HH:MM:SS):"
read RECOVERY_POINT
```

### 2. Prepare Recovery Environment
```bash
# Stop application servers
kubectl scale deployment app --replicas=0

# Create recovery database
createdb recovery_db

# Notify team
./notify-team.sh "Starting database recovery to $RECOVERY_POINT"
```

### 3. Restore Database
```bash
# Download backup
gsutil cp gs://backups/database/latest.backup /tmp/

# Restore to recovery database
pg_restore -d recovery_db /tmp/latest.backup

# Apply point-in-time recovery
psql -d recovery_db -c "SELECT pg_wal_replay_to_timestamp('$RECOVERY_POINT');"
```

### 4. Verify Recovery
```bash
# Check data integrity
./verify-data-integrity.sh recovery_db

# Run consistency checks
psql -d recovery_db -f consistency-checks.sql

# Compare with expected state
./compare-databases.sh production_db recovery_db
```

### 5. Switch to Recovered Database
```bash
# Rename databases
psql -c "ALTER DATABASE production_db RENAME TO production_db_old;"
psql -c "ALTER DATABASE recovery_db RENAME TO production_db;"

# Update connection strings
kubectl set env deployment/app DATABASE_URL=$NEW_DB_URL

# Restart application
kubectl scale deployment app --replicas=3
```

### 6. Post-Recovery Tasks
```bash
# Monitor application health
./monitor-health.sh

# Verify functionality
./run-smoke-tests.sh

# Clean up old database (after verification)
dropdb production_db_old

# Update documentation
echo "Recovery completed at $(date)" >> recovery-log.txt
```
```

## Compliance and Audit

### Compliance Requirements
- **Data Retention**: 7 years for audit logs, 30 days for backups
- **Recovery Testing**: Quarterly DR tests required
- **Documentation**: All procedures must be documented and reviewed annually
- **Access Control**: Recovery procedures require dual authorization

### Audit Trail
```typescript
// lib/audit-recovery.ts
export class RecoveryAudit {
  async logRecoveryAction(action: {
    type: string;
    performedBy: string;
    authorized: string;
    timestamp: Date;
    details: any;
  }) {
    // Log to immutable audit trail
    await this.writeToAuditLog(action);
    
    // Send to SIEM
    await this.sendToSIEM(action);
    
    // Archive for compliance
    await this.archiveAction(action);
  }
}
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintained by**: DevOps Team  
**Next Review**: April 2025