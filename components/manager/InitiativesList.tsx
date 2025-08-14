"use client";

import { useState, useEffect } from 'react';
import { usePaginatedInitiatives } from '@/hooks/usePaginatedInitiatives';
import { PaginationControls, PaginationPerformanceMetrics } from '@/components/manager/PaginationControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  Edit,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckSquare,
  AlertCircle,
  Clock,
  RefreshCw,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface InitiativesListProps {
  onCreateClick?: () => void;
  onEditClick?: (initiativeId: string) => void;
  showQuickStats?: boolean;
}

/**
 * InitiativesList Component
 * 
 * Features:
 * - Area-filtered initiatives display
 * - Real-time updates via subscriptions
 * - Search and filter capabilities
 * - Status, priority, and progress indicators
 * - Budget tracking
 * - Subtask completion summary
 * - Responsive table design
 * - Quick actions for each initiative
 */
export function InitiativesList({ 
  onCreateClick,
  onEditClick,
  showQuickStats = true 
}: InitiativesListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  
  // Use paginated initiatives hook with real-time filtering
  const {
    data: initiatives,
    pagination,
    loading,
    error,
    refetch,
    goToPage,
    setPageSize,
    setFilters,
    performanceMetrics
  } = usePaginatedInitiatives({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined
  });

  // Update filters when they change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: any = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      
      setFilters(filters);
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, priorityFilter, setFilters]);

  // Calculate metrics from current page data
  const metrics = {
    total: pagination.totalCount,
    inProgress: initiatives.filter(i => i.status === 'in_progress').length,
    overdue: initiatives.filter(i => isOverdue(i.target_date, i.status)).length,
    averageProgress: initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
      : 0
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { 
        variant: 'secondary' as const, 
        className: 'bg-secondary text-secondary-foreground border-border' 
      },
      in_progress: { 
        variant: 'default' as const, 
        className: 'bg-accent/10 text-accent-foreground border-accent/30' 
      },
      completed: { 
        variant: 'default' as const, 
        className: 'bg-primary/10 text-primary-foreground border-primary/30' 
      },
      on_hold: { 
        variant: 'secondary' as const, 
        className: 'bg-muted text-muted-foreground border-border' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { className: 'bg-muted text-muted-foreground border-border' },
      medium: { className: 'bg-secondary text-secondary-foreground border-border' },
      high: { className: 'bg-accent/10 text-accent-foreground border-accent/30' },
      critical: { className: 'bg-destructive/10 text-destructive border-destructive/30' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <Badge variant="outline" className={config.className}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-primary';
    if (progress >= 50) return 'bg-accent';
    if (progress >= 20) return 'bg-accent';
    return 'bg-destructive';
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isOverdue = (targetDate: string | null, status: string) => {
    if (!targetDate || status === 'completed') return false;
    return new Date(targetDate) < new Date();
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {showQuickStats && metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Initiatives</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.inProgress}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{metrics.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Progress</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.averageProgress}%</p>
                </div>
                <CheckSquare className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl text-foreground">Area Initiatives</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {onCreateClick && (
                <Button
                  size="sm"
                  onClick={onCreateClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Initiative
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search initiatives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background border-border">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Initiatives Table */}
          {error ? (
            <div className="text-center py-8 text-destructive">
              Error loading initiatives: {error}
            </div>
          ) : loading && !initiatives ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading initiatives...</p>
            </div>
          ) : initiatives.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter || priorityFilter 
                  ? 'No initiatives found matching your filters.'
                  : 'No initiatives yet. Create your first one!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initiatives.map((initiative) => (
                    <TableRow 
                      key={initiative.id}
                      className="hover:bg-accent/50 hover:text-accent-foreground transition-colors cursor-pointer"
                      onClick={() => router.push(`/manager-dashboard/initiatives/${initiative.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{initiative.title}</p>
                          {initiative.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {initiative.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {initiative.subtask_count || 0} subtasks
                            </span>
                            {initiative.subtask_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                • {initiative.completed_subtask_count || 0} completed
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(initiative.status)}</TableCell>
                      <TableCell>{getPriorityBadge(initiative.priority || 'medium')}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress 
                            value={initiative.initiative_progress || 0} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            {initiative.initiative_progress || 0}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {initiative.target_date ? (
                          <div className="flex items-center gap-1">
                            {isOverdue(initiative.target_date, initiative.status) && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className={isOverdue(initiative.target_date, initiative.status) ? 'text-destructive' : 'text-foreground'}>
                              {format(new Date(initiative.target_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-foreground">{formatCurrency(initiative.budget)}</p>
                          {initiative.actual_cost && (
                            <p className={`text-xs ${
                              initiative.budget && initiative.actual_cost > initiative.budget 
                                ? 'text-destructive' 
                                : 'text-muted-foreground'
                            }`}>
                              Spent: {formatCurrency(initiative.actual_cost)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/manager-dashboard/initiatives/${initiative.id}`);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {onEditClick && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditClick(initiative.id);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Initiative
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/manager-dashboard/initiatives/${initiative.id}/progress`);
                              }}
                            >
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Update Progress
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {initiatives.length > 0 && (
            <div className="border-t border-border">
              <PaginationControls
                pagination={pagination}
                onPageChange={goToPage}
                onPageSizeChange={setPageSize}
                loading={loading}
                showPageSizeSelector={true}
                showSummary={true}
              />
              <PaginationPerformanceMetrics 
                metrics={performanceMetrics}
                className="px-4 pb-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}