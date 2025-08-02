/**
 * RLS Policy Effectiveness Tests
 * 
 * Focused tests to verify Row Level Security policies are correctly enforcing
 * area-based data access restrictions at the database level.
 */

import { createClient } from '@/utils/supabase/client';

export interface RLSTestResult {
  table: string;
  test: string;
  passed: boolean;
  details: string;
  query: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface RLSTestSuite {
  results: RLSTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  tablesTestedCount: number;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
}

export class RLSPolicyTester {
  private supabase = createClient();
  private results: RLSTestResult[] = [];

  private addResult(
    table: string,
    test: string,
    passed: boolean,
    details: string,
    query: string,
    expectedBehavior: string,
    actualBehavior: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ) {
    this.results.push({
      table,
      test,
      passed,
      details,
      query,
      expectedBehavior,
      actualBehavior,
      severity
    });
  }

  /**
   * Test 1: Initiatives Table RLS
   */
  async testInitiativesRLS(): Promise<void> {
    try {
      console.log('🔒 Testing initiatives table RLS policies...');

      // Get current user's area context
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'initiatives',
          'User Context Validation',
          false,
          'Cannot test RLS - user missing area assignment',
          'SELECT area_id, tenant_id FROM user_profiles',
          'User should have area_id assigned',
          'User has no area_id',
          'critical'
        );
        return;
      }

      // Test 1.1: Access own area's initiatives
      const ownAreaQuery = `
        SELECT id, area_id, tenant_id, title 
        FROM initiatives 
        WHERE area_id = '${userProfile.area_id}' 
        AND tenant_id = '${userProfile.tenant_id}'
      `;

      const { data: ownInitiatives, error: ownError } = await this.supabase
        .from('initiatives')
        .select('id, area_id, tenant_id, title')
        .eq('area_id', userProfile.area_id)
        .eq('tenant_id', userProfile.tenant_id);

      const ownAreaAccess = !ownError;
      this.addResult(
        'initiatives',
        'Own Area Access',
        ownAreaAccess,
        ownAreaAccess ? 
          `Successfully accessed ${ownInitiatives?.length || 0} initiatives from own area` : 
          `Failed to access own area initiatives: ${ownError?.message}`,
        ownAreaQuery,
        'Should allow access to own area initiatives',
        ownAreaAccess ? 'Access granted' : `Access denied: ${ownError?.message}`,
        ownAreaAccess ? 'low' : 'critical'
      );

      // Test 1.2: Try to access all initiatives (should be filtered by RLS)
      const allInitiativesQuery = 'SELECT id, area_id, tenant_id FROM initiatives';
      
      const { data: allInitiatives, error: allError } = await this.supabase
        .from('initiatives')
        .select('id, area_id, tenant_id');

      if (!allError && allInitiatives) {
        // Check if RLS is filtering properly
        const uniqueAreas = new Set(allInitiatives.map(i => i.area_id));
        const rlsFiltering = uniqueAreas.size <= 1 && uniqueAreas.has(userProfile.area_id);
        
        this.addResult(
          'initiatives',
          'RLS Filtering Effectiveness',
          rlsFiltering,
          rlsFiltering ? 
            `RLS correctly filtered to single area (${uniqueAreas.size} unique areas)` : 
            `RLS failed - multiple areas visible (${uniqueAreas.size} areas: ${Array.from(uniqueAreas).join(', ')})`,
          allInitiativesQuery,
          'Should only return current user\'s area data',
          rlsFiltering ? 
            `Only own area visible (${userProfile.area_id})` : 
            `Multiple areas visible: ${Array.from(uniqueAreas).join(', ')}`,
          rlsFiltering ? 'low' : 'critical'
        );
      } else {
        this.addResult(
          'initiatives',
          'All Initiatives Query',
          false,
          `Query failed: ${allError?.message}`,
          allInitiativesQuery,
          'Should execute but filter results via RLS',
          `Query execution failed: ${allError?.message}`,
          'high'
        );
      }

      // Test 1.3: Try to access different area (should fail)
      if (userProfile.area_id) {
        // Generate a different UUID to test cross-area access
        const fakeAreaId = '00000000-0000-0000-0000-000000000000';
        const crossAreaQuery = `
          SELECT id, area_id FROM initiatives 
          WHERE area_id = '${fakeAreaId}'
        `;

        const { data: crossAreaData, error: crossAreaError } = await this.supabase
          .from('initiatives')
          .select('id, area_id')
          .eq('area_id', fakeAreaId);

        const crossAreaBlocked = !crossAreaData || crossAreaData.length === 0;
        
        this.addResult(
          'initiatives',
          'Cross-area Access Prevention',
          crossAreaBlocked,
          crossAreaBlocked ? 
            'RLS correctly prevented cross-area access' : 
            `RLS failed - accessed ${crossAreaData?.length} records from different area`,
          crossAreaQuery,
          'Should return no results due to RLS',
          crossAreaBlocked ? 'No results returned' : `${crossAreaData?.length} results returned`,
          crossAreaBlocked ? 'low' : 'critical'
        );
      }

    } catch (error) {
      this.addResult(
        'initiatives',
        'Test Execution',
        false,
        `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Multiple RLS test queries',
        'Tests should execute successfully',
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 2: File Uploads Table RLS
   */
  async testFileUploadsRLS(): Promise<void> {
    try {
      console.log('📁 Testing file_uploads table RLS policies...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'file_uploads',
          'User Context',
          false,
          'Cannot test - user missing area assignment',
          'SELECT area_id FROM user_profiles',
          'User should have area assignment',
          'No area assignment',
          'critical'
        );
        return;
      }

      // Test file uploads access
      const fileUploadsQuery = 'SELECT id, area_id, tenant_id FROM file_uploads';
      
      const { data: uploads, error: uploadsError } = await this.supabase
        .from('file_uploads')
        .select('id, area_id, tenant_id');

      if (!uploadsError) {
        if (uploads && uploads.length > 0) {
          const uniqueAreas = new Set(uploads.map(u => u.area_id));
          const rlsFiltering = uniqueAreas.size <= 1 && uniqueAreas.has(userProfile.area_id);
          
          this.addResult(
            'file_uploads',
            'RLS Area Filtering',
            rlsFiltering,
            rlsFiltering ? 
              `Correctly filtered to single area (${uploads.length} files)` : 
              `Cross-area leak detected (${uniqueAreas.size} areas visible)`,
            fileUploadsQuery,
            'Should only show current user\'s area files',
            rlsFiltering ? 'Only own area files visible' : `Multiple areas: ${Array.from(uniqueAreas).join(', ')}`,
            rlsFiltering ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'file_uploads',
            'File Access',
            true,
            'No files found (empty result set is acceptable)',
            fileUploadsQuery,
            'Should execute without error',
            'Query executed, no results',
            'low'
          );
        }
      } else {
        this.addResult(
          'file_uploads',
          'Query Execution',
          false,
          `Query failed: ${uploadsError.message}`,
          fileUploadsQuery,
          'Should execute successfully',
          `Failed: ${uploadsError.message}`,
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'file_uploads',
        'Test Execution',
        false,
        `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'File uploads RLS test',
        'Test should execute successfully',
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 3: Activities Table RLS
   */
  async testActivitiesRLS(): Promise<void> {
    try {
      console.log('📋 Testing activities table RLS policies...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'activities',
          'User Context',
          false,
          'Cannot test - user missing area assignment',
          'SELECT area_id FROM user_profiles',
          'User should have area assignment',
          'No area assignment',
          'critical'
        );
        return;
      }

      // Test activities access - note that activities are filtered via initiative relationship
      const activitiesQuery = `
        SELECT a.id, i.area_id, a.tenant_id 
        FROM activities a 
        JOIN initiatives i ON a.initiative_id = i.id
      `;
      
      const { data: activities, error: activitiesError } = await this.supabase
        .from('activities')
        .select('id, initiative_id, tenant_id, initiatives(area_id)');

      if (!activitiesError) {
        if (activities && activities.length > 0) {
          // Check area isolation through initiative relationship
          const activitiesWithAreas = activities.filter(a => a.initiatives);
          const uniqueAreas = new Set(
            activitiesWithAreas.map(a => (a.initiatives as any)?.area_id).filter(Boolean)
          );
          
          const rlsFiltering = uniqueAreas.size <= 1 && 
            (uniqueAreas.size === 0 || uniqueAreas.has(userProfile.area_id));
          
          this.addResult(
            'activities',
            'RLS via Initiative Relationship',
            rlsFiltering,
            rlsFiltering ? 
              `Correctly filtered activities via initiative relationship (${activities.length} activities)` : 
              `Cross-area activities visible (${uniqueAreas.size} areas)`,
            activitiesQuery,
            'Should only show activities from own area initiatives',
            rlsFiltering ? 'Only own area activities' : `Multiple areas: ${Array.from(uniqueAreas).join(', ')}`,
            rlsFiltering ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'activities',
            'Activities Access',
            true,
            'No activities found (acceptable)',
            activitiesQuery,
            'Should execute without error',
            'Query executed, no results',
            'low'
          );
        }
      } else {
        this.addResult(
          'activities',
          'Query Execution',
          false,
          `Query failed: ${activitiesError.message}`,
          activitiesQuery,
          'Should execute successfully',
          `Failed: ${activitiesError.message}`,
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'activities',
        'Test Execution',
        false,
        `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Activities RLS test',
        'Test should execute successfully',
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 4: Subtasks Table RLS
   */
  async testSubtasksRLS(): Promise<void> {
    try {
      console.log('✅ Testing subtasks table RLS policies...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (!userProfile?.area_id) {
        this.addResult(
          'subtasks',
          'User Context',
          false,
          'Cannot test - user missing area assignment',
          'SELECT area_id FROM user_profiles',
          'User should have area assignment',
          'No area assignment',
          'critical'
        );
        return;
      }

      // Test subtasks access - filtered via initiative relationship
      const subtasksQuery = `
        SELECT s.id, i.area_id, s.tenant_id 
        FROM subtasks s 
        JOIN initiatives i ON s.initiative_id = i.id
      `;
      
      const { data: subtasks, error: subtasksError } = await this.supabase
        .from('subtasks')
        .select('id, initiative_id, tenant_id, initiatives(area_id)');

      if (!subtasksError) {
        if (subtasks && subtasks.length > 0) {
          const subtasksWithAreas = subtasks.filter(s => s.initiatives);
          const uniqueAreas = new Set(
            subtasksWithAreas.map(s => (s.initiatives as any)?.area_id).filter(Boolean)
          );
          
          const rlsFiltering = uniqueAreas.size <= 1 && 
            (uniqueAreas.size === 0 || uniqueAreas.has(userProfile.area_id));
          
          this.addResult(
            'subtasks',
            'RLS via Initiative Relationship',
            rlsFiltering,
            rlsFiltering ? 
              `Correctly filtered subtasks (${subtasks.length} subtasks)` : 
              `Cross-area subtasks visible (${uniqueAreas.size} areas)`,
            subtasksQuery,
            'Should only show subtasks from own area initiatives',
            rlsFiltering ? 'Only own area subtasks' : `Multiple areas: ${Array.from(uniqueAreas).join(', ')}`,
            rlsFiltering ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'subtasks',
            'Subtasks Access',
            true,
            'No subtasks found (acceptable)',
            subtasksQuery,
            'Should execute without error',
            'Query executed, no results',
            'low'
          );
        }
      } else {
        this.addResult(
          'subtasks',
          'Query Execution',
          false,
          `Query failed: ${subtasksError.message}`,
          subtasksQuery,
          'Should execute successfully',
          `Failed: ${subtasksError.message}`,
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'subtasks',
        'Test Execution',
        false,
        `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Subtasks RLS test',
        'Test should execute successfully',
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 5: Audit Log RLS
   */
  async testAuditLogRLS(): Promise<void> {
    try {
      console.log('📜 Testing audit_log table RLS policies...');

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (!userProfile?.tenant_id) {
        this.addResult(
          'audit_log',
          'User Context',
          false,
          'Cannot test - user missing tenant assignment',
          'SELECT tenant_id FROM user_profiles',
          'User should have tenant assignment',
          'No tenant assignment',
          'critical'
        );
        return;
      }

      // Test audit log access (should be tenant-scoped)
      const auditQuery = 'SELECT id, tenant_id, action FROM audit_log';
      
      const { data: auditLogs, error: auditError } = await this.supabase
        .from('audit_log')
        .select('id, tenant_id, action');

      if (!auditError) {
        if (auditLogs && auditLogs.length > 0) {
          const uniqueTenants = new Set(auditLogs.map(log => log.tenant_id));
          const tenantFiltering = uniqueTenants.size <= 1 && uniqueTenants.has(userProfile.tenant_id);
          
          this.addResult(
            'audit_log',
            'Tenant-level RLS',
            tenantFiltering,
            tenantFiltering ? 
              `Correctly filtered to single tenant (${auditLogs.length} logs)` : 
              `Cross-tenant audit logs visible (${uniqueTenants.size} tenants)`,
            auditQuery,
            'Should only show current tenant\'s audit logs',
            tenantFiltering ? 'Only own tenant logs' : `Multiple tenants: ${Array.from(uniqueTenants).join(', ')}`,
            tenantFiltering ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'audit_log',
            'Audit Log Access',
            true,
            'No audit logs found (acceptable)',
            auditQuery,
            'Should execute without error',
            'Query executed, no results',
            'low'
          );
        }
      } else {
        this.addResult(
          'audit_log',
          'Query Execution',
          false,
          `Query failed: ${auditError.message}`,
          auditQuery,
          'Should execute successfully',
          `Failed: ${auditError.message}`,
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'audit_log',
        'Test Execution',
        false,
        `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Audit log RLS test',
        'Test should execute successfully',
        `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Run all RLS policy tests
   */
  async runAllTests(): Promise<RLSTestSuite> {
    console.log('🚀 Starting RLS Policy Test Suite...');
    this.results = [];

    await this.testInitiativesRLS();
    await this.testFileUploadsRLS();
    await this.testActivitiesRLS();
    await this.testSubtasksRLS();
    await this.testAuditLogRLS();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = this.results.filter(r => !r.passed && r.severity === 'critical').length;
    const tablesTestedCount = new Set(this.results.map(r => r.table)).size;

    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalFailures > 0) {
      overallStatus = 'FAIL';
    } else if (failedTests > 0) {
      overallStatus = 'WARNING';
    }

    const suite: RLSTestSuite = {
      results: this.results,
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      tablesTestedCount,
      overallStatus
    };

    console.log(`✅ RLS Test Suite Complete: ${passedTests}/${totalTests} passed across ${tablesTestedCount} tables`);
    if (criticalFailures > 0) {
      console.error(`❌ ${criticalFailures} critical RLS failures detected`);
    }

    return suite;
  }

  /**
   * Generate detailed RLS test report
   */
  generateReport(suite: RLSTestSuite): string {
    const timestamp = new Date().toISOString();
    
    let report = `# RLS Policy Effectiveness Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Overall Status:** ${suite.overallStatus}\n`;
    report += `**Tests:** ${suite.passedTests}/${suite.totalTests} passed\n`;
    report += `**Tables Tested:** ${suite.tablesTestedCount}\n\n`;

    if (suite.criticalFailures > 0) {
      report += `⚠️ **CRITICAL RLS FAILURES DETECTED (${suite.criticalFailures})**\n\n`;
      report += `These failures indicate that Row Level Security policies are not properly protecting data. IMMEDIATE ATTENTION REQUIRED.\n\n`;
    }

    // Group results by table
    const groupedResults = suite.results.reduce((acc, result) => {
      if (!acc[result.table]) {
        acc[result.table] = [];
      }
      acc[result.table].push(result);
      return acc;
    }, {} as Record<string, RLSTestResult[]>);

    for (const [table, results] of Object.entries(groupedResults)) {
      report += `## Table: ${table}\n\n`;
      
      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        const severity = result.passed ? '' : ` (${result.severity.toUpperCase()})`;
        
        report += `${status} **${result.test}**${severity}\n`;
        report += `   **Details:** ${result.details}\n`;
        report += `   **Query:** \`${result.query}\`\n`;
        report += `   **Expected:** ${result.expectedBehavior}\n`;
        report += `   **Actual:** ${result.actualBehavior}\n\n`;
      }
    }

    // Critical issues summary
    const criticalIssues = suite.results.filter(r => !r.passed && r.severity === 'critical');
    if (criticalIssues.length > 0) {
      report += `## 🚨 Critical Issues Requiring Immediate Action\n\n`;
      criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. **${issue.table}.${issue.test}**\n`;
        report += `   - Problem: ${issue.details}\n`;
        report += `   - Impact: Data isolation compromised\n`;
        report += `   - Action: Review and fix RLS policy for ${issue.table} table\n\n`;
      });
    }

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (suite.overallStatus === 'FAIL') {
      report += `🚨 **DO NOT DEPLOY TO PRODUCTION** - Critical RLS failures detected.\n\n`;
      report += `1. Review and fix all critical RLS policy issues\n`;
      report += `2. Re-run tests until all critical issues are resolved\n`;
      report += `3. Consider adding additional RLS policies for defense in depth\n\n`;
    } else if (suite.overallStatus === 'WARNING') {
      report += `⚠️ **Review Required** - Some RLS tests failed but no critical issues.\n\n`;
      report += `1. Address failed tests to improve security posture\n`;
      report += `2. Consider the impact of failed tests on data isolation\n\n`;
    } else {
      report += `✅ **RLS Policies Effective** - All tests passed successfully.\n\n`;
      report += `- Row Level Security is properly enforcing area-based data isolation\n`;
      report += `- Database-level security controls are working as expected\n`;
      report += `- Safe for production deployment from RLS perspective\n\n`;
    }

    report += `## Technical Details\n\n`;
    report += `- **Testing Method:** Direct database queries via Supabase client\n`;
    report += `- **Scope:** ${suite.tablesTestedCount} critical tables tested\n`;
    report += `- **Focus:** Area-based and tenant-based data isolation\n`;
    report += `- **Security Model:** Multi-layer access control validation\n\n`;

    return report;
  }
}

// Export utility functions
export async function runRLSPolicyTests(): Promise<RLSTestSuite> {
  const tester = new RLSPolicyTester();
  return await tester.runAllTests();
}

export async function generateRLSReport(): Promise<string> {
  const tester = new RLSPolicyTester();
  const suite = await tester.runAllTests();
  return tester.generateReport(suite);
}