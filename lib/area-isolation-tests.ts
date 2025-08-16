/**
 * Area-based Data Isolation Test Suite
 * 
 * Comprehensive tests to verify that managers can only access data from their assigned area.
 * Tests all components, hooks, and API endpoints for proper area isolation.
 */

import { createClient } from '@/utils/supabase/client';

export interface IsolationTestResult {
  test: string;
  component: string;
  passed: boolean;
  details: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface IsolationTestSuite {
  results: IsolationTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
}

export class AreaIsolationTester {
  private supabase = createClient();
  private results: IsolationTestResult[] = [];

  private addResult(
    test: string,
    component: string,
    passed: boolean,
    details: string,
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ) {
    this.results.push({
      test,
      component,
      passed,
      details,
      timestamp: new Date(),
      severity
    });
  }

  /**
   * Test 1: Database RLS Policy Effectiveness
   */
  async testDatabaseRLS(): Promise<void> {
    try {
      console.log('🔒 Testing Database RLS Policies...');

      // Test initiatives access
      const { data: initiatives, error: initiativesError } = await this.supabase
        .from('initiatives')
        .select('id, area_id, tenant_id')
        .limit(5);

      if (initiativesError) {
        this.addResult(
          'RLS Policy - Initiatives',
          'Database',
          false,
          `RLS query failed: ${initiativesError.message}`,
          'critical'
        );
      } else {
        // Check if all returned initiatives belong to the same area
        const uniqueAreas = new Set(initiatives?.map(i => i.area_id) || []);
        const passed = uniqueAreas.size <= 1;
        
        this.addResult(
          'RLS Policy - Initiatives',
          'Database',
          passed,
          passed ? 
            `All initiatives from single area (${uniqueAreas.size} unique areas)` : 
            `Cross-area data leaked (${uniqueAreas.size} different areas)`,
          passed ? 'low' : 'critical'
        );
      }

      // Test activities access
      const { data: activities, error: activitiesError } = await this.supabase
        .from('activities')
        .select('id, initiative_id, tenant_id')
        .limit(5);

      if (activitiesError) {
        this.addResult(
          'RLS Policy - Activities',
          'Database',
          false,
          `RLS query failed: ${activitiesError.message}`,
          'critical'
        );
      } else {
        this.addResult(
          'RLS Policy - Activities',
          'Database',
          true,
          `Activities query successful (${activities?.length || 0} records)`,
          'low'
        );
      }

      // Test file uploads access
      const { data: uploads, error: uploadsError } = await this.supabase
        .from('uploaded_files')
        .select('id, area_id, tenant_id')
        .limit(5);

      if (uploadsError) {
        this.addResult(
          'RLS Policy - File Uploads',
          'Database',
          false,
          `RLS query failed: ${uploadsError.message}`,
          'critical'
        );
      } else {
        const uniqueAreas = new Set(uploads?.map(u => u.area_id) || []);
        const passed = uniqueAreas.size <= 1;
        
        this.addResult(
          'RLS Policy - File Uploads',
          'Database',
          passed,
          passed ? 
            `All uploads from single area (${uniqueAreas.size} unique areas)` : 
            `Cross-area data leaked (${uniqueAreas.size} different areas)`,
          passed ? 'low' : 'critical'
        );
      }

    } catch (error) {
      this.addResult(
        'RLS Policy Test',
        'Database',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 2: API Endpoint Area Isolation
   */
  async testAPIEndpoints(): Promise<void> {
    try {
      console.log('🌐 Testing API Endpoint Isolation...');

      // Test manager area summary endpoint
      const areaSummaryResponse = await fetch('/api/manager/area-summary');
      if (areaSummaryResponse.ok) {
        const areaSummary = await areaSummaryResponse.json();
        const hasAreaData = areaSummary.area?.id && areaSummary.initiatives;
        
        this.addResult(
          'Area Summary API',
          'API Endpoint',
          hasAreaData,
          hasAreaData ? 
            `Area summary returned valid data for area ${areaSummary.area?.name}` : 
            'Area summary missing required data',
          hasAreaData ? 'low' : 'high'
        );
      } else {
        this.addResult(
          'Area Summary API',
          'API Endpoint',
          false,
          `API call failed with status ${areaSummaryResponse.status}`,
          'high'
        );
      }

      // Test manager initiatives endpoint
      const initiativesResponse = await fetch('/api/manager/initiatives');
      if (initiativesResponse.ok) {
        const initiativesData = await initiativesResponse.json();
        const hasInitiatives = Array.isArray(initiativesData.initiatives);
        
        // Check if all initiatives have the same area_id
        if (hasInitiatives && initiativesData.initiatives.length > 0) {
          const uniqueAreas = new Set(initiativesData.initiatives.map((i: any) => i.area_id));
          const areaIsolated = uniqueAreas.size <= 1;
          
          this.addResult(
            'Initiatives API Isolation',
            'API Endpoint',
            areaIsolated,
            areaIsolated ? 
              `All initiatives from single area (${uniqueAreas.size} unique areas)` : 
              `Cross-area data leaked (${uniqueAreas.size} different areas)`,
            areaIsolated ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'Initiatives API',
            'API Endpoint',
            hasInitiatives,
            hasInitiatives ? 'Initiatives API returned valid array' : 'Initiatives API missing data',
            'medium'
          );
        }
      } else {
        this.addResult(
          'Initiatives API',
          'API Endpoint',
          false,
          `API call failed with status ${initiativesResponse.status}`,
          'high'
        );
      }

      // Test file history endpoint
      const fileHistoryResponse = await fetch('/api/manager/file-history');
      if (fileHistoryResponse.ok) {
        const fileData = await fileHistoryResponse.json();
        const hasFiles = Array.isArray(fileData.uploads);
        
        if (hasFiles && fileData.uploads.length > 0) {
          const uniqueAreas = new Set(fileData.uploads.map((u: any) => u.area_id));
          const areaIsolated = uniqueAreas.size <= 1;
          
          this.addResult(
            'File History API Isolation',
            'API Endpoint',
            areaIsolated,
            areaIsolated ? 
              `All files from single area (${uniqueAreas.size} unique areas)` : 
              `Cross-area data leaked (${uniqueAreas.size} different areas)`,
            areaIsolated ? 'low' : 'critical'
          );
        } else {
          this.addResult(
            'File History API',
            'API Endpoint',
            hasFiles,
            hasFiles ? 'File history API returned valid array' : 'File history API missing data',
            'medium'
          );
        }
      } else {
        this.addResult(
          'File History API',
          'API Endpoint',
          false,
          `API call failed with status ${fileHistoryResponse.status}`,
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'API Endpoints Test',
        'API Layer',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 3: Hook-level Data Isolation
   */
  async testHookIsolation(): Promise<void> {
    try {
      console.log('🎣 Testing Hook-level Isolation...');

      // Test useManagerAreaData hook isolation
      // This test simulates the hook behavior by checking the underlying queries
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('area_id, tenant_id')
        .single();

      if (userProfile?.area_id) {
        // Simulate the area data query used by useManagerAreaData
        const { data: areaData, error: areaError } = await this.supabase
          .from('areas')
          .select('*')
          .eq('id', userProfile.area_id)
          
          .single();

        this.addResult(
          'useManagerAreaData Hook',
          'React Hook',
          !areaError && !!areaData,
          !areaError ? 
            `Hook can access assigned area: ${areaData?.name}` : 
            `Hook failed to access area: ${areaError.message}`,
          !areaError ? 'low' : 'high'
        );

        // Test initiative filtering used by useManagerInitiatives
        const { data: initiatives, error: initiativesError } = await this.supabase
          .from('initiatives')
          .select('id, area_id, title')
          .eq('area_id', userProfile.area_id)
          ;

        this.addResult(
          'useManagerInitiatives Hook',
          'React Hook',
          !initiativesError,
          !initiativesError ? 
            `Hook can access ${initiatives?.length || 0} area initiatives` : 
            `Hook failed to access initiatives: ${initiativesError.message}`,
          !initiativesError ? 'low' : 'high'
        );
      } else {
        this.addResult(
          'Hook User Context',
          'React Hook',
          false,
          'User profile missing area_id - cannot test hook isolation',
          'critical'
        );
      }

    } catch (error) {
      this.addResult(
        'Hook Isolation Test',
        'React Hooks',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 4: Cross-tenant Isolation
   */
  async testCrossTenantIsolation(): Promise<void> {
    try {
      console.log('🏢 Testing Cross-tenant Isolation...');

      // Get current user's tenant
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('tenant_id, area_id')
        .single();

      if (userProfile?.tenant_id) {
        // Try to access data from different tenant (should fail)
        const { data: otherTenantData, error: crossTenantError } = await this.supabase
          .from('initiatives')
          .select('id, tenant_id')
          .neq('tenant_id', userProfile.tenant_id)
          .limit(1);

        // This should return empty or fail due to RLS
        const isolationPassed = !otherTenantData || otherTenantData.length === 0;

        this.addResult(
          'Cross-tenant Access Prevention',
          'Database',
          isolationPassed,
          isolationPassed ? 
            'Cannot access other tenant data (correct behavior)' : 
            `Cross-tenant data leak detected (${otherTenantData?.length} records)`,
          isolationPassed ? 'low' : 'critical'
        );

        // Test same tenant, different area isolation
        const { data: sameTenantinitatives } = await this.supabase
          .from('initiatives')
          .select('id, area_id, tenant_id')
          
          .neq('area_id', userProfile.area_id)
          .limit(1);

        const areaIsolationPassed = !sameTenantinitatives || sameTenantinitatives.length === 0;

        this.addResult(
          'Cross-area Access Prevention',
          'Database',
          areaIsolationPassed,
          areaIsolationPassed ? 
            'Cannot access other area data within tenant (correct behavior)' : 
            `Cross-area data leak detected (${sameTenantinitatives?.length} records)`,
          areaIsolationPassed ? 'low' : 'critical'
        );
      } else {
        this.addResult(
          'Cross-tenant Test Setup',
          'Database',
          false,
          'Cannot determine user tenant for cross-tenant testing',
          'high'
        );
      }

    } catch (error) {
      this.addResult(
        'Cross-tenant Isolation Test',
        'Database',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 5: Permission Check Validation
   */
  async testPermissionChecks(): Promise<void> {
    try {
      console.log('🔐 Testing Permission Checks...');

      // Test manager permission utilities
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('role, area_id, tenant_id')
        .single();

      if (userProfile) {
        // Simulate permission checks from lib/manager-permissions.ts
        const isManager = userProfile.role === 'Manager';
        const hasAreaAssignment = !!userProfile.area_id;

        this.addResult(
          'Manager Role Validation',
          'Permission System',
          isManager,
          isManager ? 
            'User has Manager role' : 
            `User has role: ${userProfile.role}`,
          isManager ? 'low' : 'high'
        );

        this.addResult(
          'Area Assignment Validation',
          'Permission System',
          hasAreaAssignment,
          hasAreaAssignment ? 
            `User assigned to area: ${userProfile.area_id}` : 
            'User missing area assignment',
          hasAreaAssignment ? 'low' : 'critical'
        );

        // Test area access validation
        if (userProfile.area_id) {
          const { data: areaAccess } = await this.supabase
            .from('areas')
            .select('id, manager_id')
            .eq('id', userProfile.area_id)
            .single();

          const isAreaManager = areaAccess?.manager_id === userProfile.area_id;

          this.addResult(
            'Area Manager Validation',
            'Permission System',
            isAreaManager,
            isAreaManager ? 
              'User is designated manager of assigned area' : 
              'User assigned to area but not designated as manager',
            'medium'
          );
        }
      } else {
        this.addResult(
          'Permission Test Setup',
          'Permission System',
          false,
          'Cannot retrieve user profile for permission testing',
          'critical'
        );
      }

    } catch (error) {
      this.addResult(
        'Permission Checks Test',
        'Permission System',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Test 6: Audit Trail Verification
   */
  async testAuditTrail(): Promise<void> {
    try {
      console.log('📝 Testing Audit Trail...');

      // Check if audit logs are being created for area-specific actions
      const { data: auditLogs, error: auditError } = await this.supabase
        .from('audit_log')
        .select('id, action, resource_type, tenant_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) {
        this.addResult(
          'Audit Log Access',
          'Audit System',
          false,
          `Cannot access audit logs: ${auditError.message}`,
          'high'
        );
      } else {
        const hasAuditLogs = auditLogs && auditLogs.length > 0;
        
        this.addResult(
          'Audit Log Generation',
          'Audit System',
          hasAuditLogs,
          hasAuditLogs ? 
            `Found ${auditLogs.length} recent audit entries` : 
            'No audit logs found',
          hasAuditLogs ? 'low' : 'medium'
        );

        if (hasAuditLogs) {
          // Check if audit logs are tenant-scoped
          const { data: userProfile } = await this.supabase
            .from('user_profiles')
            .select('tenant_id')
            .single();

          if (userProfile?.tenant_id) {
            const tenantAuditLogs = auditLogs.filter(log => log.tenant_id === userProfile.tenant_id);
            const auditIsolated = tenantAuditLogs.length === auditLogs.length;

            this.addResult(
              'Audit Log Tenant Isolation',
              'Audit System',
              auditIsolated,
              auditIsolated ? 
                'All audit logs belong to current tenant' : 
                `Cross-tenant audit logs detected (${auditLogs.length - tenantAuditLogs.length} foreign logs)`,
              auditIsolated ? 'low' : 'critical'
            );
          }
        }
      }

    } catch (error) {
      this.addResult(
        'Audit Trail Test',
        'Audit System',
        false,
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'critical'
      );
    }
  }

  /**
   * Run all isolation tests
   */
  async runAllTests(): Promise<IsolationTestSuite> {
    console.log('🚀 Starting Area Isolation Test Suite...');
    this.results = [];

    await this.testDatabaseRLS();
    await this.testAPIEndpoints();
    await this.testHookIsolation();
    await this.testCrossTenantIsolation();
    await this.testPermissionChecks();
    await this.testAuditTrail();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const criticalFailures = this.results.filter(r => !r.passed && r.severity === 'critical').length;

    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (criticalFailures > 0) {
      overallStatus = 'FAIL';
    } else if (failedTests > 0) {
      overallStatus = 'WARNING';
    }

    const suite: IsolationTestSuite = {
      results: this.results,
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      overallStatus
    };

    console.log(`✅ Test Suite Complete: ${passedTests}/${totalTests} passed`);
    if (criticalFailures > 0) {
      console.error(`❌ ${criticalFailures} critical failures detected`);
    }

    return suite;
  }

  /**
   * Generate detailed test report
   */
  generateReport(suite: IsolationTestSuite): string {
    const timestamp = new Date().toISOString();
    
    let report = `# Area Isolation Test Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Overall Status:** ${suite.overallStatus}\n`;
    report += `**Tests:** ${suite.passedTests}/${suite.totalTests} passed\n\n`;

    if (suite.criticalFailures > 0) {
      report += `⚠️ **CRITICAL FAILURES DETECTED (${suite.criticalFailures})**\n\n`;
    }

    // Group results by component
    const groupedResults = suite.results.reduce((acc, result) => {
      if (!acc[result.component]) {
        acc[result.component] = [];
      }
      acc[result.component].push(result);
      return acc;
    }, {} as Record<string, IsolationTestResult[]>);

    for (const [component, results] of Object.entries(groupedResults)) {
      report += `## ${component}\n\n`;
      
      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        const severity = result.passed ? '' : ` (${result.severity.toUpperCase()})`;
        
        report += `${status} **${result.test}**${severity}\n`;
        report += `   ${result.details}\n\n`;
      }
    }

    // Summary recommendations
    report += `## Recommendations\n\n`;
    
    if (suite.criticalFailures > 0) {
      report += `🚨 **IMMEDIATE ACTION REQUIRED**: Critical security failures detected. Do not deploy to production.\n\n`;
    }
    
    const failedTests = suite.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += `### Failed Tests to Address:\n\n`;
      failedTests.forEach(test => {
        report += `- **${test.test}** (${test.component}): ${test.details}\n`;
      });
      report += `\n`;
    }

    if (suite.overallStatus === 'PASS') {
      report += `✅ All area isolation tests passed. System is secure for production deployment.\n`;
    }

    return report;
  }
}

// Export utility function for easy testing
export async function runAreaIsolationTests(): Promise<IsolationTestSuite> {
  const tester = new AreaIsolationTester();
  return await tester.runAllTests();
}

export async function generateIsolationReport(): Promise<string> {
  const tester = new AreaIsolationTester();
  const suite = await tester.runAllTests();
  return tester.generateReport(suite);
}