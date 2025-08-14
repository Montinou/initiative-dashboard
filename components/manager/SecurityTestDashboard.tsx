'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Database,
  Globe,
  Settings,
  Building,
  Lock,
  FileText,
  Download
} from 'lucide-react';
import { AreaIsolationTester, IsolationTestSuite, IsolationTestResult } from '@/lib/area-isolation-tests';
import { RLSPolicyTester, RLSTestSuite, RLSTestResult } from '@/lib/rls-policy-tests';
import { AuditTrailTester, AuditTestSuite, AuditTestResult } from '@/lib/audit-trail-tests';

interface SecurityTestDashboardProps {
  className?: string;
}

export function SecurityTestDashboard({ className }: SecurityTestDashboardProps) {
  const [testSuite, setTestSuite] = useState<IsolationTestSuite | null>(null);
  const [rlsTestSuite, setRlsTestSuite] = useState<RLSTestSuite | null>(null);
  const [auditTestSuite, setAuditTestSuite] = useState<AuditTestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testType, setTestType] = useState<'isolation' | 'rls' | 'audit' | 'all'>('all');

  const runTests = async () => {
    setIsRunning(true);
    try {
      if (testType === 'isolation' || testType === 'all') {
        const tester = new AreaIsolationTester();
        const results = await tester.runAllTests();
        setTestSuite(results);
      }
      
      if (testType === 'rls' || testType === 'all') {
        const rlsTester = new RLSPolicyTester();
        const rlsResults = await rlsTester.runAllTests();
        setRlsTestSuite(rlsResults);
      }
      
      if (testType === 'audit' || testType === 'all') {
        const auditTester = new AuditTrailTester();
        const auditResults = await auditTester.runAllTests();
        setAuditTestSuite(auditResults);
      }
    } catch (error) {
      console.error('Failed to run security tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = async () => {
    if (!testSuite && !rlsTestSuite && !auditTestSuite) return;
    
    try {
      let combinedReport = '';
      
      if (testSuite) {
        const tester = new AreaIsolationTester();
        const isolationReport = tester.generateReport(testSuite);
        combinedReport += isolationReport + '\n\n---\n\n';
      }
      
      if (rlsTestSuite) {
        const rlsTester = new RLSPolicyTester();
        const rlsReport = rlsTester.generateReport(rlsTestSuite);
        combinedReport += rlsReport + '\n\n---\n\n';
      }
      
      if (auditTestSuite) {
        const auditTester = new AuditTrailTester();
        const auditReport = auditTester.generateReport(auditTestSuite);
        combinedReport += auditReport;
      }
      
      const blob = new Blob([combinedReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-test-report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-accent-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'Database':
        return <Database className="h-4 w-4" />;
      case 'API Endpoint':
        return <Globe className="h-4 w-4" />;
      case 'React Hook':
        return <Settings className="h-4 w-4" />;
      case 'Permission System':
        return <Lock className="h-4 w-4" />;
      case 'Audit System':
        return <FileText className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string, passed: boolean) => {
    if (passed) {
      return <Badge variant="outline" className="text-primary border-primary">PASS</Badge>;
    }

    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-accent text-accent-foreground">HIGH</Badge>;
      case 'medium':
        return <Badge variant="secondary">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="outline">LOW</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  const groupedResults = (() => {
    const combined: Record<string, (IsolationTestResult | RLSTestResult | AuditTestResult)[]> = {};
    
    if (testSuite) {
      testSuite.results.forEach(result => {
        if (!combined[result.component]) {
          combined[result.component] = [];
        }
        combined[result.component].push(result);
      });
    }
    
    if (rlsTestSuite) {
      rlsTestSuite.results.forEach(result => {
        const component = `RLS: ${result.table}`;
        if (!combined[component]) {
          combined[component] = [];
        }
        combined[component].push(result);
      });
    }
    
    if (auditTestSuite) {
      auditTestSuite.results.forEach(result => {
        const component = `Audit: ${result.action}`;
        if (!combined[component]) {
          combined[component] = [];
        }
        combined[component].push(result);
      });
    }
    
    return combined;
  })();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Security Test Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive area-based data isolation testing
          </p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as 'isolation' | 'rls' | 'audit' | 'all')}
            className="px-3 py-2 border border-border rounded-md bg-background"
            disabled={isRunning}
          >
            <option value="all">All Tests</option>
            <option value="isolation">Isolation Tests</option>
            <option value="rls">RLS Policy Tests</option>
            <option value="audit">Audit Trail Tests</option>
          </select>
          
          {(testSuite || rlsTestSuite || auditTestSuite) && (
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="bg-primary hover:bg-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run Security Tests'}
          </Button>
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Running Security Tests</CardTitle>
            <CardDescription>
              Testing area-based data isolation across all components...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments to complete all tests.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Results Overview */}
      {(testSuite || rlsTestSuite || auditTestSuite) && (() => {
        const totalTests = (testSuite?.totalTests || 0) + (rlsTestSuite?.totalTests || 0) + (auditTestSuite?.totalTests || 0);
        const passedTests = (testSuite?.passedTests || 0) + (rlsTestSuite?.passedTests || 0) + (auditTestSuite?.passedTests || 0);
        const failedTests = (testSuite?.failedTests || 0) + (rlsTestSuite?.failedTests || 0) + (auditTestSuite?.failedTests || 0);
        const criticalFailures = (testSuite?.criticalFailures || 0) + (rlsTestSuite?.criticalFailures || 0) + (auditTestSuite?.criticalFailures || 0);
        
        const overallStatus = criticalFailures > 0 ? 'FAIL' : failedTests > 0 ? 'WARNING' : 'PASS';
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(overallStatus)}
                      <span className="text-2xl font-bold">{overallStatus}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tests Passed</p>
                    <p className="text-2xl font-bold text-primary">
                      {passedTests}/{totalTests}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Failed Tests</p>
                    <p className="text-2xl font-bold text-destructive">{failedTests}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                    <p className="text-2xl font-bold text-destructive">{criticalFailures}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Critical Alerts */}
      {(() => {
        const totalCriticalFailures = (testSuite?.criticalFailures || 0) + (rlsTestSuite?.criticalFailures || 0) + (auditTestSuite?.criticalFailures || 0);
        
        if (totalCriticalFailures > 0) {
          return (
            <Alert className="border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>CRITICAL SECURITY FAILURES DETECTED!</strong> 
                {totalCriticalFailures} critical issue{totalCriticalFailures > 1 ? 's' : ''} found. 
                Do not deploy to production until resolved.
                {testSuite?.criticalFailures && (
                  <div className="mt-1">• {testSuite.criticalFailures} area isolation failure{testSuite.criticalFailures > 1 ? 's' : ''}</div>
                )}
                {rlsTestSuite?.criticalFailures && (
                  <div className="mt-1">• {rlsTestSuite.criticalFailures} RLS policy failure{rlsTestSuite.criticalFailures > 1 ? 's' : ''}</div>
                )}
                {auditTestSuite?.criticalFailures && (
                  <div className="mt-1">• {auditTestSuite.criticalFailures} audit trail failure{auditTestSuite.criticalFailures > 1 ? 's' : ''}</div>
                )}
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {/* Detailed Results */}
      {(testSuite || rlsTestSuite || auditTestSuite) && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {testSuite && <TabsTrigger value="isolation">Isolation</TabsTrigger>}
            {rlsTestSuite && <TabsTrigger value="rls">RLS Policy</TabsTrigger>}
            {auditTestSuite && <TabsTrigger value="audit">Audit Trail</TabsTrigger>}
            <TabsTrigger value="details">All Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(groupedResults).map(([component, results]) => {
                const passedCount = results.filter(r => r.passed).length;
                const totalCount = results.length;
                const hasCritical = results.some(r => !r.passed && r.severity === 'critical');
                
                return (
                  <Card key={component}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getComponentIcon(component)}
                        {component}
                        <Badge 
                          variant={passedCount === totalCount ? "default" : "destructive"}
                          className="ml-auto"
                        >
                          {passedCount}/{totalCount}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.map((result, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                          >
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                              <span className="font-medium">{result.test}</span>
                            </div>
                            {getSeverityBadge(result.severity, result.passed)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {testSuite && (
            <TabsContent value="isolation" className="space-y-4">
              <div className="space-y-4">
                {testSuite.results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          {result.test}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{result.component}</Badge>
                          {getSeverityBadge(result.severity, result.passed)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Details:</strong> {result.details}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Tested:</strong> {result.timestamp.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {rlsTestSuite && (
            <TabsContent value="rls" className="space-y-4">
              <div className="space-y-4">
                {rlsTestSuite.results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          {result.table}: {result.test}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">RLS Policy</Badge>
                          {getSeverityBadge(result.severity, result.passed)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Details:</strong> {result.details}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Expected:</strong> {result.expectedBehavior}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Actual:</strong> {result.actualBehavior}
                      </p>
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Query Details</summary>
                        <code className="block mt-1 p-2 bg-muted rounded whitespace-pre-wrap">
                          {result.query}
                        </code>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {auditTestSuite && (
            <TabsContent value="audit" className="space-y-4">
              <div className="space-y-4">
                {auditTestSuite.results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          {result.action}: {result.test}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Audit Trail</Badge>
                          {getSeverityBadge(result.severity, result.passed)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Details:</strong> {result.details}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Audit Entry Found:</strong> {result.auditEntryFound ? 'Yes' : 'No'}
                      </p>
                      {result.expectedFields.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <strong>Expected Fields:</strong> {result.expectedFields.join(', ')}
                        </p>
                      )}
                      {result.actualFields.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <strong>Actual Fields:</strong> {result.actualFields.join(', ')}
                        </p>
                      )}
                      {result.auditData && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">Audit Data</summary>
                          <pre className="mt-1 p-2 bg-muted rounded whitespace-pre-wrap text-xs">
                            {JSON.stringify(result.auditData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              {testSuite && testSuite.results.map((result, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {result.test}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{result.component}</Badge>
                        {getSeverityBadge(result.severity, result.passed)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Details:</strong> {result.details}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Tested:</strong> {result.timestamp.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
              
              {rlsTestSuite && rlsTestSuite.results.map((result, index) => (
                <Card key={`rls-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        RLS: {result.table} - {result.test}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">RLS Policy</Badge>
                        {getSeverityBadge(result.severity, result.passed)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Details:</strong> {result.details}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Expected:</strong> {result.expectedBehavior}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Actual:</strong> {result.actualBehavior}
                    </p>
                  </CardContent>
                </Card>
              ))}
              
              {auditTestSuite && auditTestSuite.results.map((result, index) => (
                <Card key={`audit-${index}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        Audit: {result.action} - {result.test}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Audit Trail</Badge>
                        {getSeverityBadge(result.severity, result.passed)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Details:</strong> {result.details}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Audit Entry Found:</strong> {result.auditEntryFound ? 'Yes' : 'No'}
                    </p>
                    {result.auditData && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Audit Data:</strong> {JSON.stringify(result.auditData)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Initial State */}
      {!testSuite && !rlsTestSuite && !auditTestSuite && !isRunning && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Test Security</h3>
            <p className="text-muted-foreground mb-6">
              Click "Run Security Tests" to verify area-based data isolation across all components.
            </p>
            <Button onClick={runTests} className="bg-primary hover:bg-primary/90">
              <Play className="h-4 w-4 mr-2" />
              Start Security Testing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}