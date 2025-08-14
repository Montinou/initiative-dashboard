"use client";

import { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Pause,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Eye,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOKRDepartments } from '@/hooks/useOKRData';

interface OKRDashboardProps {
  userRole: 'CEO' | 'Admin';
}

export function OKRDashboard({ userRole }: OKRDashboardProps) {
  const { data, loading, error, refetch } = useOKRDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border border-destructive/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-medium text-destructive">Error loading OKR data</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No OKR Data Available</h3>
          <p className="text-muted-foreground">No departments or initiatives found for this organization.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '🟢': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950';
      case '🟡': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950';
      case '🔴': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredDepartments = selectedDepartment === 'all' 
    ? data.departments 
    : data.departments.filter(dept => dept.id === selectedDepartment);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            OKR Department Tracking
          </h2>
          <p className="text-muted-foreground text-sm">
            Monitor objectives and key results across all departments
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {data.departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: 'overview' | 'detailed') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Departments</p>
                <p className="text-2xl font-bold">{data.summary.totalDepartments}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                {data.summary.departmentsByStatus.green} On Track
              </Badge>
              {data.summary.departmentsByStatus.red > 0 && (
                <Badge className="bg-destructive/10 text-destructive">
                  {data.summary.departmentsByStatus.red} At Risk
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Initiatives</p>
                <p className="text-2xl font-bold">{data.summary.totalInitiatives}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-full">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">{data.summary.avgTenantProgress}% Average Progress</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Critical Items</p>
                <p className="text-2xl font-bold">{data.summary.criticalInitiatives}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-950 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-orange-600 dark:text-orange-400 text-sm mt-3">
            {data.summary.criticalInitiatives > 0 ? 'Require attention' : 'All under control'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Activities</p>
                <p className="text-2xl font-bold">{data.summary.totalActivities}</p>
              </div>
              <div className="p-3 bg-cyan-100 dark:bg-cyan-950 rounded-full">
                <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <p className="text-cyan-600 dark:text-cyan-400 text-sm mt-3">
              Across all initiatives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDepartments.map((department, index) => (
          <Card 
            key={department.id}
            className="hover:bg-accent/50 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${department.status === '🟢' ? 'animate-pulse' : ''}`}>
                    {department.status}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                    <CardDescription>
                      {department.description || 'Department objectives and key results'}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(department.status)}>
                  {department.progress}%
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">{department.progress}%</span>
                  </div>
                  <Progress value={department.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-medium">{department.metrics.completedInitiatives}</span>
                    <span className="text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">{department.metrics.inProgressInitiatives}</span>
                    <span className="text-muted-foreground">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">{department.metrics.atRiskInitiatives}</span>
                    <span className="text-muted-foreground">At Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium">{department.metrics.totalActivities}</span>
                    <span className="text-muted-foreground">Activities</span>
                  </div>
                </div>

                {viewMode === 'detailed' && department.criticalInitiatives.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Critical Initiatives
                    </h4>
                    {department.criticalInitiatives.map(initiative => (
                      <div key={initiative.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{initiative.name}</span>
                          <Badge className={getPriorityColor(initiative.priority)}>
                            {initiative.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Leader: {initiative.leader}</span>
                          <span className="font-medium">{initiative.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground text-sm">
                    {department.metrics.totalInitiatives} total initiatives
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Last Updated */}
      <div className="text-center text-muted-foreground text-sm">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}