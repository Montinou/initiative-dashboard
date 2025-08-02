/**
 * Audit Trail Functionality Tests
 * 
 * Comprehensive tests to verify that audit logging is working correctly,
 * capturing all necessary events, and maintaining proper data isolation.
 */

import { createClient } from '@/utils/supabase/client';

export interface AuditTestResult {
  test: string;
  action: string;
  passed: boolean;
  details: string;
  auditEntryFound: boolean;
  auditData?: any;
  expectedFields: string[];
  actualFields: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface AuditTestSuite {
  results: AuditTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  auditEntriesFound: number;
  actionsTestedCount: number;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
}

export class AuditTrailTester {
  private supabase = createClient();
  private results: AuditTestResult[] = [];
  private testSessionId = `test_${Date.now()}`;

  private addResult(
    test: string,
    action: string,
    passed: boolean,
    details: string,
    auditEntryFound: boolean,
    auditData?: any,
    expectedFields: string[] = [],
    actualFields: string[] = [],
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ) {
    this.results.push({
      test,
      action,
      passed,
      details,
      auditEntryFound,
      auditData,
      expectedFields,
      actualFields,
      severity
    });
  }

  /**
   * Test 1: Initiative Creation Audit
   */
  async testInitiativeCreationAudit(): Promise<void> {
    try {
      console.log('📝 Testing initiative creation audit logging...');

      // Get current user and area context
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('id, area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'Initiative Creation Audit',
          'initiative_create',
          false,
          'Cannot test - user missing area assignment',
          false,
          null,
          [],
          [],
          'critical'
        );
        return;
      }

      // Record initial audit count
      const { data: initialAudits } = await this.supabase
        .from('audit_log')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('action', 'initiative_create');

      const initialCount = initialAudits?.length || 0;

      // Create a test initiative
      const testInitiative = {
        title: `Audit Test Initiative ${this.testSessionId}`,
        description: 'Testing audit trail functionality',
        area_id: userProfile.area_id,
        tenant_id: userProfile.tenant_id,
        created_by: userProfile.id,
        priority: 'medium',
        status: 'planning'
      };

      const { data: newInitiative, error: createError } = await this.supabase
        .from('initiatives')
        .insert(testInitiative)
        .select('id')
        .single();

      if (createError || !newInitiative) {
        this.addResult(
          'Initiative Creation Audit',
          'initiative_create',
          false,
          `Failed to create test initiative: ${createError?.message}`,
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      // Wait for audit trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if audit entry was created
      const { data: auditEntries } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('action', 'initiative_create')
        .eq('resource_id', newInitiative.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const auditFound = auditEntries && auditEntries.length > 0;
      const auditEntry = auditEntries?.[0];

      const expectedFields = [
        'action', 'resource_type', 'resource_id', 'tenant_id', 
        'user_id', 'new_values', 'created_at'
      ];
      const actualFields = auditEntry ? Object.keys(auditEntry) : [];

      const hasRequiredFields = expectedFields.every(field => 
        actualFields.includes(field) && auditEntry[field] !== null
      );

      const passed = auditFound && hasRequiredFields && 
        auditEntry.action === 'initiative_create' &&
        auditEntry.resource_type === 'initiative' &&
        auditEntry.tenant_id === userProfile.tenant_id;

      this.addResult(
        'Initiative Creation Audit',
        'initiative_create',
        passed,
        passed ? 
          `Audit entry created successfully with all required fields` : 
          `Audit logging failed - ${!auditFound ? 'no entry found' : 'missing required fields'}`,
        auditFound,
        auditEntry,
        expectedFields,
        actualFields,
        passed ? 'low' : 'critical'
      );

      // Cleanup: Remove test initiative
      if (newInitiative.id) {
        await this.supabase
          .from('initiatives')
          .delete()
          .eq('id', newInitiative.id);
      }

    } catch (error) {
      this.addResult(
        'Initiative Creation Audit',
        'initiative_create',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false,
        null,
        [],
        [],
        'critical'
      );
    }
  }

  /**
   * Test 2: Initiative Update Audit
   */
  async testInitiativeUpdateAudit(): Promise<void> {
    try {
      console.log('✏️ Testing initiative update audit logging...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('id, area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'Initiative Update Audit',
          'initiative_update',
          false,
          'Cannot test - user missing area assignment',
          false,
          null,
          [],
          [],
          'critical'
        );
        return;
      }

      // Create a test initiative first
      const { data: testInitiative } = await this.supabase
        .from('initiatives')
        .insert({
          title: `Audit Update Test ${this.testSessionId}`,
          description: 'Testing update audit',
          area_id: userProfile.area_id,
          tenant_id: userProfile.tenant_id,
          created_by: userProfile.id,
          priority: 'low',
          status: 'planning'
        })
        .select('id')
        .single();

      if (!testInitiative) {
        this.addResult(
          'Initiative Update Audit',
          'initiative_update',
          false,
          'Failed to create test initiative for update test',
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      // Wait and then update the initiative
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateError } = await this.supabase
        .from('initiatives')
        .update({
          priority: 'high',
          status: 'in_progress',
          progress: 25
        })
        .eq('id', testInitiative.id);

      if (updateError) {
        this.addResult(
          'Initiative Update Audit',
          'initiative_update',
          false,
          `Failed to update test initiative: ${updateError.message}`,
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      // Wait for audit trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for update audit entry
      const { data: auditEntries } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('action', 'initiative_update')
        .eq('resource_id', testInitiative.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const auditFound = auditEntries && auditEntries.length > 0;
      const auditEntry = auditEntries?.[0];

      const expectedFields = [
        'action', 'resource_type', 'resource_id', 'tenant_id', 
        'user_id', 'old_values', 'new_values', 'created_at'
      ];
      const actualFields = auditEntry ? Object.keys(auditEntry) : [];

      const hasRequiredFields = expectedFields.every(field => 
        actualFields.includes(field)
      );

      const hasOldAndNewValues = auditEntry?.old_values && auditEntry?.new_values;

      const passed = auditFound && hasRequiredFields && hasOldAndNewValues &&
        auditEntry.action === 'initiative_update' &&
        auditEntry.tenant_id === userProfile.tenant_id;

      this.addResult(
        'Initiative Update Audit',
        'initiative_update',
        passed,
        passed ? 
          `Update audit captured old and new values correctly` : 
          `Update audit failed - ${!auditFound ? 'no entry' : !hasOldAndNewValues ? 'missing old/new values' : 'invalid fields'}`,
        auditFound,
        auditEntry,
        expectedFields,
        actualFields,
        passed ? 'low' : 'critical'
      );

      // Cleanup
      await this.supabase
        .from('initiatives')
        .delete()
        .eq('id', testInitiative.id);

    } catch (error) {
      this.addResult(
        'Initiative Update Audit',
        'initiative_update',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false,
        null,
        [],
        [],
        'critical'
      );
    }
  }

  /**
   * Test 3: File Upload Audit
   */
  async testFileUploadAudit(): Promise<void> {
    try {
      console.log('📁 Testing file upload audit logging...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('id, area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'File Upload Audit',
          'file_upload',
          false,
          'Cannot test - user missing area assignment',
          false,
          null,
          [],
          [],
          'critical'
        );
        return;
      }

      // Create a test file upload record
      const testUpload = {
        filename: `audit_test_${this.testSessionId}.xlsx`,
        original_filename: 'audit_test.xlsx',
        file_size: 1024,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upload_status: 'completed',
        area_id: userProfile.area_id,
        tenant_id: userProfile.tenant_id,
        uploaded_by: userProfile.id,
        processed_data: { test: 'audit' }
      };

      const { data: uploadRecord, error: uploadError } = await this.supabase
        .from('file_uploads')
        .insert(testUpload)
        .select('id')
        .single();

      if (uploadError || !uploadRecord) {
        this.addResult(
          'File Upload Audit',
          'file_upload',
          false,
          `Failed to create test upload: ${uploadError?.message}`,
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      // Wait for audit trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for audit entry
      const { data: auditEntries } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('resource_type', 'file_upload')
        .eq('resource_id', uploadRecord.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const auditFound = auditEntries && auditEntries.length > 0;
      const auditEntry = auditEntries?.[0];

      const expectedFields = [
        'action', 'resource_type', 'resource_id', 'tenant_id', 
        'user_id', 'new_values', 'created_at'
      ];
      const actualFields = auditEntry ? Object.keys(auditEntry) : [];

      const passed = auditFound && 
        auditEntry?.resource_type === 'file_upload' &&
        auditEntry?.tenant_id === userProfile.tenant_id &&
        auditEntry?.user_id === userProfile.id;

      this.addResult(
        'File Upload Audit',
        auditEntry?.action || 'file_upload',
        passed,
        passed ? 
          `File upload audit logged successfully` : 
          `File upload audit failed - ${!auditFound ? 'no entry found' : 'invalid audit data'}`,
        auditFound,
        auditEntry,
        expectedFields,
        actualFields,
        passed ? 'low' : 'high'
      );

      // Cleanup
      await this.supabase
        .from('file_uploads')
        .delete()
        .eq('id', uploadRecord.id);

    } catch (error) {
      this.addResult(
        'File Upload Audit',
        'file_upload',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false,
        null,
        [],
        [],
        'critical'
      );
    }
  }

  /**
   * Test 4: Audit Log Tenant Isolation
   */
  async testAuditLogTenantIsolation(): Promise<void> {
    try {
      console.log('🏢 Testing audit log tenant isolation...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('tenant_id')
        .single();

      if (!userProfile?.tenant_id) {
        this.addResult(
          'Audit Log Tenant Isolation',
          'audit_access',
          false,
          'Cannot test - user missing tenant assignment',
          false,
          null,
          [],
          [],
          'critical'
        );
        return;
      }

      // Try to access all audit logs (should be filtered by RLS)
      const { data: auditLogs, error: auditError } = await this.supabase
        .from('audit_log')
        .select('id, tenant_id, action')
        .limit(100);

      if (auditError) {
        this.addResult(
          'Audit Log Tenant Isolation',
          'audit_access',
          false,
          `Failed to query audit logs: ${auditError.message}`,
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      if (auditLogs && auditLogs.length > 0) {
        const uniqueTenants = new Set(auditLogs.map(log => log.tenant_id));
        const tenantIsolated = uniqueTenants.size === 1 && 
          uniqueTenants.has(userProfile.tenant_id);

        this.addResult(
          'Audit Log Tenant Isolation',
          'audit_access',
          tenantIsolated,
          tenantIsolated ? 
            `Audit logs properly isolated to current tenant (${auditLogs.length} logs)` : 
            `Tenant isolation breach - ${uniqueTenants.size} tenants visible: ${Array.from(uniqueTenants).join(', ')}`,
          true,
          { logCount: auditLogs.length, tenants: Array.from(uniqueTenants) },
          ['tenant_id'],
          ['tenant_id'],
          tenantIsolated ? 'low' : 'critical'
        );
      } else {
        this.addResult(
          'Audit Log Tenant Isolation',
          'audit_access',
          true,
          'No audit logs found (acceptable for new tenant)',
          false,
          null,
          [],
          [],
          'low'
        );
      }

    } catch (error) {
      this.addResult(
        'Audit Log Tenant Isolation',
        'audit_access',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false,
        null,
        [],
        [],
        'critical'
      );
    }
  }

  /**
   * Test 5: Audit Log Data Completeness
   */
  async testAuditLogDataCompleteness(): Promise<void> {
    try {
      console.log('📊 Testing audit log data completeness...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('tenant_id')
        .single();

      if (!userProfile?.tenant_id) {
        this.addResult(
          'Audit Log Data Completeness',
          'audit_completeness',
          false,
          'Cannot test - user missing tenant assignment',
          false,
          null,
          [],
          [],
          'critical'
        );
        return;
      }

      // Get recent audit logs to check data completeness
      const { data: recentAudits, error: auditError } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) {
        this.addResult(
          'Audit Log Data Completeness',
          'audit_completeness',
          false,
          `Failed to query audit logs: ${auditError.message}`,
          false,
          null,
          [],
          [],
          'high'
        );
        return;
      }

      if (!recentAudits || recentAudits.length === 0) {
        this.addResult(
          'Audit Log Data Completeness',
          'audit_completeness',
          true,
          'No recent audit logs found (acceptable for new system)',
          false,
          null,
          [],
          [],
          'low'
        );
        return;
      }

      // Check data completeness for each audit entry
      const requiredFields = [
        'id', 'tenant_id', 'user_id', 'action', 'resource_type', 
        'resource_id', 'created_at'
      ];

      let completeEntries = 0;
      let incompleteEntries = 0;
      const incompleteDetails: string[] = [];

      recentAudits.forEach((audit, index) => {
        const missingFields = requiredFields.filter(field => 
          !audit[field] || audit[field] === null
        );

        if (missingFields.length === 0) {
          completeEntries++;
        } else {
          incompleteEntries++;
          incompleteDetails.push(`Entry ${index + 1}: missing ${missingFields.join(', ')}`);
        }
      });

      const passed = incompleteEntries === 0;

      this.addResult(
        'Audit Log Data Completeness',
        'audit_completeness',
        passed,
        passed ? 
          `All ${completeEntries} audit entries have complete data` : 
          `${incompleteEntries}/${recentAudits.length} entries incomplete: ${incompleteDetails.join('; ')}`,
        true,
        { 
          totalEntries: recentAudits.length, 
          completeEntries, 
          incompleteEntries,
          incompleteDetails
        },
        requiredFields,
        Object.keys(recentAudits[0] || {}),
        passed ? 'low' : 'high'
      );

    } catch (error) {
      this.addResult(
        'Audit Log Data Completeness',
        'audit_completeness',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        false,
        null,
        [],
        [],
        'critical'
      );
    }
  }

  /**
   * Run all audit trail tests
   */
  async runAllTests(): Promise<AuditTestSuite> {
    console.log('🚀 Starting Audit Trail Test Suite...');
    this.results = [];

    await this.testInitiativeCreationAudit();
    await this.testInitiativeUpdateAudit();
    await this.testFileUploadAudit();
    await this.testAuditLogTenantIsolation();
    await this.testAuditLogDataCompleteness();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = this.results.filter(r => !r.passed && r.severity === 'critical').length;
    const auditEntriesFound = this.results.filter(r => r.auditEntryFound).length;
    const actionsTestedCount = new Set(this.results.map(r => r.action)).size;

    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalFailures > 0) {
      overallStatus = 'FAIL';
    } else if (failedTests > 0) {
      overallStatus = 'WARNING';
    }

    const suite: AuditTestSuite = {
      results: this.results,
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      auditEntriesFound,
      actionsTestedCount,
      overallStatus
    };

    console.log(`✅ Audit Trail Test Suite Complete: ${passedTests}/${totalTests} passed, ${auditEntriesFound} audit entries found`);
    if (criticalFailures > 0) {
      console.error(`❌ ${criticalFailures} critical audit trail failures detected`);
    }

    return suite;
  }

  /**
   * Generate detailed audit trail test report
   */
  generateReport(suite: AuditTestSuite): string {
    const timestamp = new Date().toISOString();
    
    let report = `# Audit Trail Functionality Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Overall Status:** ${suite.overallStatus}\n`;
    report += `**Tests:** ${suite.passedTests}/${suite.totalTests} passed\n`;
    report += `**Audit Entries Found:** ${suite.auditEntriesFound}\n`;
    report += `**Actions Tested:** ${suite.actionsTestedCount}\n\n`;

    if (suite.criticalFailures > 0) {
      report += `⚠️ **CRITICAL AUDIT TRAIL FAILURES DETECTED (${suite.criticalFailures})**\n\n`;
      report += `These failures indicate that audit logging is not working properly. This poses a significant compliance and security risk.\n\n`;
    }

    // Group results by action
    const groupedResults = suite.results.reduce((acc, result) => {
      if (!acc[result.action]) {
        acc[result.action] = [];
      }
      acc[result.action].push(result);
      return acc;
    }, {} as Record<string, AuditTestResult[]>);

    for (const [action, results] of Object.entries(groupedResults)) {
      report += `## Action: ${action}\n\n`;
      
      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        const severity = result.passed ? '' : ` (${result.severity.toUpperCase()})`;
        
        report += `${status} **${result.test}**${severity}\n`;
        report += `   **Details:** ${result.details}\n`;
        report += `   **Audit Entry Found:** ${result.auditEntryFound ? 'Yes' : 'No'}\n`;
        
        if (result.auditData) {
          report += `   **Audit Data:** \`${JSON.stringify(result.auditData, null, 2)}\`\n`;
        }
        
        if (result.expectedFields.length > 0) {
          report += `   **Expected Fields:** ${result.expectedFields.join(', ')}\n`;
          report += `   **Actual Fields:** ${result.actualFields.join(', ')}\n`;
        }
        
        report += `\n`;
      }
    }

    // Critical issues summary
    const criticalIssues = suite.results.filter(r => !r.passed && r.severity === 'critical');
    if (criticalIssues.length > 0) {
      report += `## 🚨 Critical Issues Requiring Immediate Action\n\n`;
      criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. **${issue.test}**\n`;
        report += `   - Problem: ${issue.details}\n`;
        report += `   - Impact: Audit trail compromised for ${issue.action}\n`;
        report += `   - Action: Review and fix audit logging triggers/policies\n\n`;
      });
    }

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (suite.overallStatus === 'FAIL') {
      report += `🚨 **CRITICAL AUDIT TRAIL ISSUES** - Compliance and security at risk.\n\n`;
      report += `1. Immediately review and fix audit logging mechanisms\n`;
      report += `2. Verify database triggers are properly configured\n`;
      report += `3. Test audit trail manually for critical operations\n`;
      report += `4. Do not deploy to production until audit trail is fully functional\n\n`;
    } else if (suite.overallStatus === 'WARNING') {
      report += `⚠️ **Audit Trail Issues Found** - Some audit functionality not working properly.\n\n`;
      report += `1. Address failed audit tests to ensure complete logging\n`;
      report += `2. Review audit trail requirements and implementation\n`;
      report += `3. Consider adding additional audit points for comprehensive coverage\n\n`;
    } else {
      report += `✅ **Audit Trail Functioning Properly** - All tests passed successfully.\n\n`;
      report += `- Audit logging is capturing all tested operations correctly\n`;
      report += `- Data isolation is maintained in audit logs\n`;
      report += `- Audit entries contain all required fields and data\n`;
      report += `- System meets compliance requirements for audit logging\n\n`;
    }

    report += `## Technical Details\n\n`;
    report += `- **Testing Method:** Live database operations with audit verification\n`;
    report += `- **Operations Tested:** ${suite.actionsTestedCount} different actions\n`;
    report += `- **Audit Entries Found:** ${suite.auditEntriesFound}/${suite.totalTests} tests\n`;
    report += `- **Focus:** Data completeness, tenant isolation, and audit coverage\n`;
    report += `- **Compliance:** Supports SOX, GDPR, and other regulatory requirements\n\n`;

    return report;
  }
}

// Export utility functions
export async function runAuditTrailTests(): Promise<AuditTestSuite> {
  const tester = new AuditTrailTester();
  return await tester.runAllTests();
}

export async function generateAuditReport(): Promise<string> {
  const tester = new AuditTrailTester();
  const suite = await tester.runAllTests();
  return tester.generateReport(suite);
}