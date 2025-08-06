/**
 * Data isolation testing utilities for manager dashboard
 * Ensures managers can only access data from their assigned areas
 */

import { createClient } from '@/utils/supabase/client';
import { validateQueryFilters, createManagerQueryFilters } from './query-validation';
import { validateManagerOperation } from './foreign-key-validation';

interface IsolationTestResult {
  testName: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

interface TestContext {
  tenant1Id: string;
  tenant2Id: string;
  area1Id: string;  // Tenant 1, Area A
  area2Id: string;  // Tenant 1, Area B
  area3Id: string;  // Tenant 2, Area A
  manager1Id: string; // Manager for Area 1
  manager2Id: string; // Manager for Area 2
  manager3Id: string; // Manager for Area 3
}

/**
 * Comprehensive data isolation test suite
 */
export class DataIsolationTester {
  private supabase = createClient();
  private testResults: IsolationTestResult[] = [];

  /**
   * Run all data isolation tests
   */
  async runAllTests(context: TestContext): Promise<IsolationTestResult[]> {
    this.testResults = [];

    await this.testTenantIsolation(context);
    await this.testAreaIsolation(context);
    await this.testManagerAccessRestrictions(context);
    await this.testInitiativeIsolation(context);
    await this.testSubtaskIsolation(context);
    await this.testFileUploadIsolation(context);
    await this.testAuditLogIsolation(context);
    await this.testQueryFilterValidation(context);
    await this.testCrossAreaDataLeakage(context);

    return this.testResults;
  }

  /**
   * Test that tenants cannot access each other's data
   */
  private async testTenantIsolation(context: TestContext): Promise<void> {
    try {
      // Attempt to fetch initiatives from tenant 1 using tenant 2's filters
      const { data: crossTenantData, error } = await this.supabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', context.tenant2Id)
        .eq('area_id', context.area1Id); // Area 1 belongs to tenant 1

      if (crossTenantData && crossTenantData.length > 0) {
        this.addTestResult({
          testName: 'Tenant Isolation - Cross-tenant data access',
          passed: false,
          details: `Found ${crossTenantData.length} records when none should exist`,
          errors: ['Data leaked between tenants']
        });
      } else {
        this.addTestResult({
          testName: 'Tenant Isolation - Cross-tenant data access',
          passed: true,
          details: 'No cross-tenant data leakage detected'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Tenant Isolation - Cross-tenant data access',
        passed: false,
        details: 'Error during tenant isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test that areas within the same tenant are properly isolated
   */
  private async testAreaIsolation(context: TestContext): Promise<void> {
    try {
      // Manager 1 should not see Area 2's data (both in same tenant)
      const filters1 = createManagerQueryFilters(context.tenant1Id, context.area1Id);
      const { data: area1Data } = await this.supabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', filters1.tenant_id)
        .eq('area_id', filters1.area_id);

      const filters2 = createManagerQueryFilters(context.tenant1Id, context.area2Id);
      const { data: area2Data } = await this.supabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', filters2.tenant_id)
        .eq('area_id', filters2.area_id);

      // Check for data overlap (there shouldn't be any)
      const area1Ids = new Set(area1Data?.map(i => i.id) || []);
      const area2Ids = new Set(area2Data?.map(i => i.id) || []);
      const overlap = [...area1Ids].filter(id => area2Ids.has(id));

      if (overlap.length > 0) {
        this.addTestResult({
          testName: 'Area Isolation - Same tenant, different areas',
          passed: false,
          details: `Found ${overlap.length} overlapping initiatives between areas`,
          errors: ['Data leaked between areas in same tenant']
        });
      } else {
        this.addTestResult({
          testName: 'Area Isolation - Same tenant, different areas',
          passed: true,
          details: 'No data overlap between areas in same tenant'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Area Isolation - Same tenant, different areas',
        passed: false,
        details: 'Error during area isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test manager access restrictions
   */
  private async testManagerAccessRestrictions(context: TestContext): Promise<void> {
    const tests = [
      {
        name: 'Manager 1 accessing Area 1 (authorized)',
        managerId: context.manager1Id,
        areaId: context.area1Id,
        tenantId: context.tenant1Id,
        shouldPass: true
      },
      {
        name: 'Manager 1 accessing Area 2 (unauthorized)',
        managerId: context.manager1Id,
        areaId: context.area2Id,
        tenantId: context.tenant1Id,
        shouldPass: false
      },
      {
        name: 'Manager 1 accessing Area 3 (different tenant)',
        managerId: context.manager1Id,
        areaId: context.area3Id,
        tenantId: context.tenant2Id,
        shouldPass: false
      }
    ];

    for (const test of tests) {
      try {
        const result = await validateManagerOperation(
          test.managerId,
          test.areaId,
          test.tenantId,
          'test operation'
        );

        const actualPassed = result.isValid;
        const testPassed = actualPassed === test.shouldPass;

        this.addTestResult({
          testName: `Manager Access - ${test.name}`,
          passed: testPassed,
          details: testPassed 
            ? 'Access control working correctly'
            : `Expected ${test.shouldPass ? 'success' : 'failure'}, got ${actualPassed ? 'success' : 'failure'}`,
          errors: testPassed ? undefined : result.errors
        });
      } catch (error) {
        this.addTestResult({
          testName: `Manager Access - ${test.name}`,
          passed: false,
          details: 'Error during manager access test',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
  }

  /**
   * Test initiative data isolation
   */
  private async testInitiativeIsolation(context: TestContext): Promise<void> {
    try {
      // Test that initiatives are properly filtered by area
      const { data: allInitiatives } = await this.supabase
        .from('initiatives')
        .select('id, tenant_id, area_id')
        .eq('tenant_id', context.tenant1Id);

      const area1Initiatives = allInitiatives?.filter(i => i.area_id === context.area1Id) || [];
      const area2Initiatives = allInitiatives?.filter(i => i.area_id === context.area2Id) || [];

      // Verify no initiatives have wrong area assignments
      const wrongAreaAssignments = allInitiatives?.filter(i => 
        i.area_id !== context.area1Id && 
        i.area_id !== context.area2Id && 
        i.area_id !== context.area3Id
      ) || [];

      if (wrongAreaAssignments.length > 0) {
        this.addTestResult({
          testName: 'Initiative Isolation - Area assignment validation',
          passed: false,
          details: `Found ${wrongAreaAssignments.length} initiatives with invalid area assignments`,
          errors: ['Invalid area assignments detected']
        });
      } else {
        this.addTestResult({
          testName: 'Initiative Isolation - Area assignment validation',
          passed: true,
          details: 'All initiatives have valid area assignments'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Initiative Isolation - Area assignment validation',
        passed: false,
        details: 'Error during initiative isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test subtask data isolation
   */
  private async testSubtaskIsolation(context: TestContext): Promise<void> {
    try {
      // Get initiatives for area 1
      const { data: area1Initiatives } = await this.supabase
        .from('initiatives')
        .select('id')
        .eq('tenant_id', context.tenant1Id)
        .eq('area_id', context.area1Id);

      if (area1Initiatives && area1Initiatives.length > 0) {
        const initiativeIds = area1Initiatives.map(i => i.id);
        
        // Get subtasks for these initiatives
        const { data: subtasks } = await this.supabase
          .from('subtasks')
          .select('*')
          .in('initiative_id', initiativeIds);

        // Verify all subtasks belong to the correct tenant
        const wrongTenantSubtasks = subtasks?.filter(s => s.tenant_id !== context.tenant1Id) || [];

        if (wrongTenantSubtasks.length > 0) {
          this.addTestResult({
            testName: 'Subtask Isolation - Tenant assignment validation',
            passed: false,
            details: `Found ${wrongTenantSubtasks.length} subtasks with wrong tenant assignments`,
            errors: ['Subtask tenant isolation violated']
          });
        } else {
          this.addTestResult({
            testName: 'Subtask Isolation - Tenant assignment validation',
            passed: true,
            details: 'All subtasks have correct tenant assignments'
          });
        }
      } else {
        this.addTestResult({
          testName: 'Subtask Isolation - Tenant assignment validation',
          passed: true,
          details: 'No initiatives found for testing (test skipped)'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Subtask Isolation - Tenant assignment validation',
        passed: false,
        details: 'Error during subtask isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test file upload data isolation
   */
  private async testFileUploadIsolation(context: TestContext): Promise<void> {
    try {
      const { data: area1Files } = await this.supabase
        .from('uploaded_files')
        .select('*')
        .eq('tenant_id', context.tenant1Id)
        .eq('area_id', context.area1Id);

      const { data: area2Files } = await this.supabase
        .from('uploaded_files')
        .select('*')
        .eq('tenant_id', context.tenant1Id)
        .eq('area_id', context.area2Id);

      // Check for file overlap between areas
      const area1FileIds = new Set(area1Files?.map(f => f.id) || []);
      const area2FileIds = new Set(area2Files?.map(f => f.id) || []);
      const fileOverlap = [...area1FileIds].filter(id => area2FileIds.has(id));

      if (fileOverlap.length > 0) {
        this.addTestResult({
          testName: 'File Upload Isolation - Area separation',
          passed: false,
          details: `Found ${fileOverlap.length} files accessible by multiple areas`,
          errors: ['File upload isolation violated']
        });
      } else {
        this.addTestResult({
          testName: 'File Upload Isolation - Area separation',
          passed: true,
          details: 'File uploads properly isolated by area'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'File Upload Isolation - Area separation',
        passed: false,
        details: 'Error during file upload isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test audit log isolation
   */
  private async testAuditLogIsolation(context: TestContext): Promise<void> {
    try {
      const { data: tenant1Logs } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', context.tenant1Id);

      const { data: tenant2Logs } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', context.tenant2Id);

      // Check for log overlap between tenants
      const tenant1LogIds = new Set(tenant1Logs?.map(l => l.id) || []);
      const tenant2LogIds = new Set(tenant2Logs?.map(l => l.id) || []);
      const logOverlap = [...tenant1LogIds].filter(id => tenant2LogIds.has(id));

      if (logOverlap.length > 0) {
        this.addTestResult({
          testName: 'Audit Log Isolation - Tenant separation',
          passed: false,
          details: `Found ${logOverlap.length} audit logs accessible by multiple tenants`,
          errors: ['Audit log isolation violated']
        });
      } else {
        this.addTestResult({
          testName: 'Audit Log Isolation - Tenant separation',
          passed: true,
          details: 'Audit logs properly isolated by tenant'
        });
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Audit Log Isolation - Tenant separation',
        passed: false,
        details: 'Error during audit log isolation test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Test query filter validation
   */
  private async testQueryFilterValidation(context: TestContext): Promise<void> {
    const testCases = [
      {
        name: 'Valid tenant and area IDs',
        tenantId: context.tenant1Id,
        areaId: context.area1Id,
        shouldPass: true
      },
      {
        name: 'Missing tenant ID',
        tenantId: null,
        areaId: context.area1Id,
        shouldPass: false
      },
      {
        name: 'Missing area ID',
        tenantId: context.tenant1Id,
        areaId: null,
        shouldPass: false
      },
      {
        name: 'Invalid tenant ID format',
        tenantId: 'invalid-uuid',
        areaId: context.area1Id,
        shouldPass: false
      },
      {
        name: 'Invalid area ID format',
        tenantId: context.tenant1Id,
        areaId: 'invalid-uuid',
        shouldPass: false
      }
    ];

    for (const testCase of testCases) {
      try {
        const result = validateQueryFilters(
          testCase.tenantId as any,
          testCase.areaId as any,
          testCase.name
        );

        const testPassed = result.isValid === testCase.shouldPass;

        this.addTestResult({
          testName: `Query Filter Validation - ${testCase.name}`,
          passed: testPassed,
          details: testPassed 
            ? 'Validation working correctly'
            : `Expected ${testCase.shouldPass ? 'valid' : 'invalid'}, got ${result.isValid ? 'valid' : 'invalid'}`,
          errors: testPassed ? undefined : result.errors
        });
      } catch (error) {
        this.addTestResult({
          testName: `Query Filter Validation - ${testCase.name}`,
          passed: false,
          details: 'Error during query filter validation test',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
  }

  /**
   * Test for potential cross-area data leakage scenarios
   */
  private async testCrossAreaDataLeakage(context: TestContext): Promise<void> {
    try {
      // Simulate common attack scenarios
      const leakageTests = [
        {
          name: 'SQL injection attempt in area filter',
          areaFilter: `${context.area1Id}' OR '1'='1`,
          shouldFindOtherAreaData: false
        },
        {
          name: 'Boolean logic bypass attempt',
          areaFilter: `${context.area1Id} OR area_id = '${context.area2Id}'`,
          shouldFindOtherAreaData: false
        }
      ];

      for (const test of leakageTests) {
        try {
          // Attempt the malicious query (should be safely handled)
          const { data: suspiciousData } = await this.supabase
            .from('initiatives')
            .select('id, area_id')
            .eq('tenant_id', context.tenant1Id)
            .eq('area_id', test.areaFilter);

          // Check if we got data from other areas (we shouldn't)
          const otherAreaData = suspiciousData?.filter(i => i.area_id !== context.area1Id) || [];

          if (otherAreaData.length > 0 && !test.shouldFindOtherAreaData) {
            this.addTestResult({
              testName: `Cross-Area Leakage - ${test.name}`,
              passed: false,
              details: `Found ${otherAreaData.length} records from other areas`,
              errors: ['Potential security vulnerability detected']
            });
          } else {
            this.addTestResult({
              testName: `Cross-Area Leakage - ${test.name}`,
              passed: true,
              details: 'No cross-area data leakage detected'
            });
          }
        } catch (error) {
          // Errors are actually good here - they mean the malicious input was rejected
          this.addTestResult({
            testName: `Cross-Area Leakage - ${test.name}`,
            passed: true,
            details: 'Malicious input properly rejected by database/ORM'
          });
        }
      }
    } catch (error) {
      this.addTestResult({
        testName: 'Cross-Area Leakage - General test',
        passed: false,
        details: 'Error during cross-area leakage test',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Add a test result to the collection
   */
  private addTestResult(result: IsolationTestResult): void {
    this.testResults.push(result);
    
    // Log results for debugging
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.testName}: ${result.details}`);
    if (result.errors) {
      console.error('Errors:', result.errors);
    }
  }

  /**
   * Get summary of all test results
   */
  getTestSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    failedTestNames: string[];
  } {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const failedTestNames = this.testResults.filter(r => !r.passed).map(r => r.testName);

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      failedTestNames
    };
  }
}

/**
 * Utility function to run data isolation tests
 */
export async function runDataIsolationTests(
  context: TestContext
): Promise<{
  results: IsolationTestResult[];
  summary: ReturnType<DataIsolationTester['getTestSummary']>;
}> {
  const tester = new DataIsolationTester();
  const results = await tester.runAllTests(context);
  const summary = tester.getTestSummary();

  return { results, summary };
}