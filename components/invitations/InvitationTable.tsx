'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { secureFetch } from '@/lib/auth/secure-fetch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface InvitationTableProps {
  userProfile: any;
  areas: any[];
  onRefresh?: () => void;
}

export default function InvitationTable({ 
  userProfile, 
  areas,
  onRefresh 
}: InvitationTableProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    role: 'all',
    areaId: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const supabase = createClient();
  
  // Add null check for userProfile
  if (!userProfile || !userProfile.tenant_id) {
    console.error('InvitationTable: Invalid userProfile', userProfile);
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Unable to load invitations. Please refresh the page.</p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchInvitations();
  }, [filters, pagination.page]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.areaId !== 'all' && { areaId: filters.areaId }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      // Use secure fetch helper that follows Supabase best practices
      const response = await secureFetch(`/api/invitations/v2/list?${params}`);

      if (!response.ok) throw new Error('Failed to fetch invitations');

      const data = await response.json();
      setInvitations(data.invitations);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.loadError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      // Use secure fetch helper that follows Supabase best practices
      const response = await secureFetch('/api/invitations/v2/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId })
      });

      if (!response.ok) throw new Error('Failed to resend');

      toast({
        title: t('toasts.resendSuccessTitle'),
        description: t('toasts.resendSuccessDesc')
      });
      
      fetchInvitations();
      onRefresh?.();
    } catch (error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.resendError'),
        variant: 'destructive'
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      // Use secure fetch helper that follows Supabase best practices
      const response = await secureFetch('/api/invitations/v2/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId })
      });

      if (!response.ok) throw new Error('Failed to cancel');

      toast({
        title: t('toasts.cancelSuccessTitle'),
        description: t('toasts.cancelSuccessDesc')
      });
      
      fetchInvitations();
      onRefresh?.();
    } catch (error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.cancelError'),
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: 'resend' | 'cancel') => {
    if (selectedIds.length === 0) return;

    try {
      const endpoint = action === 'resend' ? '/api/invitations/v2/resend' : '/api/invitations/v2/cancel';
      
      // Use secure fetch helper that follows Supabase best practices
      for (const id of selectedIds) {
        await secureFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invitationId: id })
        });
      }

      toast({
        title: t('toasts.bulkCompletedTitle'),
        description: t('toasts.bulkCompletedDesc', { count: selectedIds.length, action }),
      });
      
      setSelectedIds([]);
      fetchInvitations();
      onRefresh?.();
    } catch (error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.cancelError'),
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date() && status !== 'accepted';
    
    if (isExpired) {
      return <Badge variant="destructive">{t('table.badges.expired')}</Badge>;
    }
    
    const variants: any = {
      'pending': 'secondary',
      'sent': 'default',
      'accepted': 'success',
      'cancelled': 'destructive'
    };
    
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors: any = {
      'CEO': 'bg-purple-100 text-purple-800',
      'Admin': 'bg-blue-100 text-blue-800',
      'Manager': 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={colors[role] || 'bg-muted text-foreground'}>
        {role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('table.title')}</CardTitle>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('table.selectedCount', { count: selectedIds.length })}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('resend')}
              >
                {t('table.bulk.resend')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('cancel')}
              >
                {t('table.bulk.cancel')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('table.filters.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({...filters, status: value})}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('table.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('table.filters.allStatus')}</SelectItem>
                <SelectItem value="pending">{t('table.filters.pending')}</SelectItem>
                <SelectItem value="sent">{t('table.filters.sent')}</SelectItem>
                <SelectItem value="accepted">{t('table.filters.accepted')}</SelectItem>
                <SelectItem value="expired">{t('table.filters.expired')}</SelectItem>
                <SelectItem value="cancelled">{t('table.filters.cancelled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.role}
              onValueChange={(value) => setFilters({...filters, role: value})}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('table.filters.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('table.filters.allRoles')}</SelectItem>
                <SelectItem value="CEO">CEO</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.areaId}
              onValueChange={(value) => setFilters({...filters, areaId: value})}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('table.filters.area')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('table.filters.allAreas')}</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({
                search: '',
                status: 'all',
                role: 'all',
                areaId: 'all',
                dateFrom: '',
                dateTo: ''
              })}
            >
              {t('table.filters.clear')}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.length === invitations.length && invitations.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(invitations.map(i => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>{t('table.headers.email')}</TableHead>
                <TableHead>{t('table.headers.role')}</TableHead>
                <TableHead>{t('table.headers.area')}</TableHead>
                <TableHead>{t('table.headers.status')}</TableHead>
                <TableHead>{t('table.headers.invitedBy')}</TableHead>
                <TableHead>{t('table.headers.date')}</TableHead>
                <TableHead className="text-right">{t('table.headers.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                    {t('table.loading')}
                  </TableCell>
                </TableRow>
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('table.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(invitation.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds([...selectedIds, invitation.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== invitation.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{invitation.area?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expires_at)}</TableCell>
                    <TableCell>
                      {invitation.sender?.full_name || invitation.sender?.email || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invitation.status !== 'accepted' && invitation.status !== 'cancelled' && (
                            <>
                              <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                                <Mail className="w-4 h-4 mr-2" />
                                {t('table.row.resend')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600"
                              >
                                <X className="w-4 h-4 mr-2" />
                                {t('table.row.cancel')}
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/auth/accept-invitation?token=${invitation.token}`
                            );
                            toast({
                              title: t('table.row.linkCopiedTitle'),
                              description: t('table.row.linkCopiedDesc')
                            });
                          }}>
                            {t('table.row.copyLink')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {t('table.row.showing', {
                from: ((pagination.page - 1) * pagination.limit) + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('table.row.previous')}
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === pagination.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPagination({...pagination, page})}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                disabled={pagination.page === pagination.totalPages}
              >
                {t('table.row.next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}