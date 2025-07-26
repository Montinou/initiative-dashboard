'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  industry: string;
  description: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
}

interface CreateTenantForm {
  name: string;
  industry: string;
  description: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantForm>({
    name: '',
    industry: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/tenants?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        setError('Failed to load tenants');
      }
    } catch (error) {
      setError('Network error while loading tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        setSuccess('Tenant created successfully');
        setCreateForm({ name: '', industry: '', description: '' });
        setIsCreateModalOpen(false);
        loadTenants(); // Reload the list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create tenant');
      }
    } catch (error) {
      setError('Network error while creating tenant');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        setSuccess(currentStatus ? 'Tenant deactivated' : 'Tenant activated');
        loadTenants();
      } else {
        setError('Failed to update tenant status');
      }
    } catch (error) {
      setError('Network error while updating tenant');
    }
  };

  // Filter tenants based on search and industry
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !selectedIndustry || tenant.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  // Get unique industries for filter
  const industries = Array.from(new Set(tenants.map(t => t.industry))).filter(Boolean);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tenant Management</h2>
          <p className="text-slate-400">
            Manage all tenant organizations and their configurations
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="bg-slate-700 border-slate-600"
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={createForm.industry}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, industry: value }))}
                  required
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Brief description of the company"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isCreating ? 'Creating...' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-500 bg-red-50 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="">All Industries</SelectItem>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>
                      {industry.charAt(0).toUpperCase() + industry.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Tenants ({filteredTenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-slate-400 mt-2">Loading tenants...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No tenants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Company</TableHead>
                    <TableHead className="text-slate-300">Industry</TableHead>
                    <TableHead className="text-slate-300">Users</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Created</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="border-slate-700">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{tenant.name}</p>
                          <p className="text-sm text-slate-400 truncate max-w-xs">
                            {tenant.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tenant.industry}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-slate-300">
                          <Users className="h-4 w-4 mr-1" />
                          {tenant.user_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={tenant.is_active ? 'default' : 'secondary'}
                          className={tenant.is_active ? 'bg-green-600' : 'bg-red-600'}
                        >
                          {tenant.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(tenant.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600"
                            onClick={() => window.location.href = `/superadmin/tenants/${tenant.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`border-slate-600 ${
                              tenant.is_active ? 'hover:bg-red-600' : 'hover:bg-green-600'
                            }`}
                            onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                          >
                            {tenant.is_active ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}