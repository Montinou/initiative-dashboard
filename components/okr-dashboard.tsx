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
            <div key={i} className="h-32 bg-white/10 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white/10 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="backdrop-blur-xl bg-red-500/10 border border-red-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="font-medium text-red-300">Error loading OKR data</h3>
              <p className="text-sm text-red-200">{error}</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm" 
                className="mt-2 bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30"
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
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
        <CardContent className="p-6 text-center">
          <Target className="h-12 w-12 text-white/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No OKR Data Available</h3>
          <p className="text-white/70">No departments or initiatives found for this organization.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '🟢': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case '🟡': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case '🔴': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            OKR Department Tracking
          </h2>
          <p className="text-purple-200/80 text-sm">
            Monitor objectives and key results across all departments
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/90 border-white/20">
              <SelectItem value="all">All Departments</SelectItem>
              {data.departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: 'overview' | 'detailed') => setViewMode(value)}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/90 border-white/20">
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards - Enhanced Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-6">
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200/80 text-sm font-medium">Total Departments</p>
                <p className="text-2xl font-bold text-white">{data.summary.totalDepartments}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                {data.summary.departmentsByStatus.green} On Track
              </Badge>
              {data.summary.departmentsByStatus.red > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                  {data.summary.departmentsByStatus.red} At Risk
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200/80 text-sm font-medium">Total Initiatives</p>
                <p className="text-2xl font-bold text-white">{data.summary.totalInitiatives}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-green-300">{data.summary.avgTenantProgress}% Average Progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200/80 text-sm font-medium">Critical Items</p>
                <p className="text-2xl font-bold text-white">{data.summary.criticalInitiatives}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            <p className="text-orange-300 text-sm mt-3">
            {data.summary.criticalInitiatives > 0 ? 'Require attention' : 'All under control'}
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/5 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200/80 text-sm font-medium">Total Activities</p>
                <p className="text-2xl font-bold text-white">{data.summary.totalActivities}</p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-full">
                <BarChart3 className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-cyan-300 text-sm mt-3">
              Across all initiatives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards - Enhanced Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredDepartments.map((department, index) => (
          <Card 
            key={department.id}
            className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${department.status === '🟢' ? 'animate-pulse' : ''}`}>
                    {department.status}
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{department.name}</CardTitle>
                    <CardDescription className="text-purple-200/70">
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
                    <span className="text-purple-200/80">Overall Progress</span>
                    <span className="text-white font-medium">{department.progress}%</span>
                  </div>
                  <Progress value={department.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-white">{department.metrics.completedInitiatives}</span>
                    <span className="text-purple-200/70">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-white">{department.metrics.inProgressInitiatives}</span>
                    <span className="text-purple-200/70">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-white">{department.metrics.atRiskInitiatives}</span>
                    <span className="text-purple-200/70">At Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <span className="text-white">{department.metrics.totalActivities}</span>
                    <span className="text-purple-200/70">Activities</span>
                  </div>
                </div>

                {viewMode === 'detailed' && department.criticalInitiatives.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-orange-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Critical Initiatives
                    </h4>
                    {department.criticalInitiatives.map(initiative => (
                      <div key={initiative.id} className="bg-black/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{initiative.name}</span>
                          <Badge className={getPriorityColor(initiative.priority)}>
                            {initiative.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-200/70">Leader: {initiative.leader}</span>
                          <span className="text-white">{initiative.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-purple-200/70 text-sm">
                    {department.metrics.totalInitiatives} total initiatives
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-purple-300 hover:bg-white/10"
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
      <div className="text-center text-purple-200/60 text-sm">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}