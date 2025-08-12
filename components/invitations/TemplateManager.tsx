'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Eye,
  Code,
  Crown,
  Shield,
  Users,
  Star
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  role: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: any[];
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  created_by?: {
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface TemplateManagerProps {
  userProfile: any;
}

export default function TemplateManager({ userProfile }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    role: 'Manager',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
    isDefault: false
  });

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, [filterRole]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') {
        params.append('role', filterRole);
      }

      const response = await fetch(`/api/invitations/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditForm({
      name: '',
      description: '',
      role: 'Manager',
      subject: 'You\'re invited to join {{organizationName}}',
      htmlContent: getDefaultHtmlTemplate(),
      textContent: '',
      isActive: true,
      isDefault: false
    });
    setSelectedTemplate(null);
    setIsEditModalOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditForm({
      name: template.name,
      description: template.description || '',
      role: template.role,
      subject: template.subject,
      htmlContent: template.html_content,
      textContent: template.text_content || '',
      isActive: template.is_active,
      isDefault: template.is_default
    });
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const method = selectedTemplate ? 'PATCH' : 'POST';
      const body = selectedTemplate 
        ? { id: selectedTemplate.id, ...editForm }
        : editForm;

      const response = await fetch('/api/invitations/templates', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast({
        title: 'Success',
        description: `Template ${selectedTemplate ? 'updated' : 'created'} successfully`,
        variant: 'success'
      });

      setIsEditModalOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (template.is_default) {
      toast({
        title: 'Error',
        description: 'Cannot delete default template',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/invitations/templates?id=${template.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
        variant: 'success'
      });

      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateTemplate = (template: Template) => {
    setEditForm({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      role: template.role,
      subject: template.subject,
      htmlContent: template.html_content,
      textContent: template.text_content || '',
      isActive: true,
      isDefault: false
    });
    setSelectedTemplate(null);
    setIsEditModalOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CEO': return <Crown className="w-4 h-4" />;
      case 'Admin': return <Shield className="w-4 h-4" />;
      case 'Manager': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CEO': return 'bg-purple-100 text-purple-800';
      case 'Admin': return 'bg-blue-100 text-blue-800';
      case 'Manager': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDefaultHtmlTemplate = () => {
    return `<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Welcome to {{organizationName}}!</h2>
  <p>Hi {{recipientEmail}},</p>
  <p>{{inviterName}} has invited you to join our team as a {{role}}.</p>
  {{#if customMessage}}
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 0;">{{customMessage}}</p>
  </div>
  {{/if}}
  <p>Click the button below to accept your invitation:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{acceptUrl}}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
  </div>
  <p style="color: #666; font-size: 14px;">This invitation expires in {{daysRemaining}} days.</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this link: {{acceptUrl}}</p>
</body>
</html>`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invitation Templates</h2>
          <p className="text-muted-foreground">Manage email templates for different roles</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Templates</CardTitle>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="CEO">CEO</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge className={getRoleColor(template.role)}>
                          {getRoleIcon(template.role)}
                          <span className="ml-1">{template.role}</span>
                        </Badge>
                        {template.is_default && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Used {template.usage_count} times</span>
                        {template.created_by && (
                          <span>Created by {template.created_by.full_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!template.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              Design your invitation email template with variables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="e.g., Formal CEO Invitation"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({...editForm, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CEO">CEO</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                placeholder="You're invited to join {{organizationName}}"
              />
            </div>

            <Tabs defaultValue="html" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html">HTML Content</TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              </TabsList>
              <TabsContent value="html" className="space-y-2">
                <Label>HTML Template</Label>
                <Textarea
                  value={editForm.htmlContent}
                  onChange={(e) => setEditForm({...editForm, htmlContent: e.target.value})}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Enter HTML template with {{variables}}"
                />
              </TabsContent>
              <TabsContent value="text" className="space-y-2">
                <Label>Plain Text (Optional)</Label>
                <Textarea
                  value={editForm.textContent}
                  onChange={(e) => setEditForm({...editForm, textContent: e.target.value})}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Plain text version of the email"
                />
              </TabsContent>
            </Tabs>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Available variables: {`{{organizationName}}, {{recipientEmail}}, {{inviterName}}, {{role}}, {{acceptUrl}}, {{daysRemaining}}, {{customMessage}}, {{areaName}}`}
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({...editForm, isActive: checked})}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.isDefault}
                  onCheckedChange={(checked) => setEditForm({...editForm, isDefault: checked})}
                />
                <Label>Set as Default</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {selectedTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium mb-2">Subject:</p>
                <p>{selectedTemplate.subject}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">HTML Preview:</p>
                <div 
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.html_content }}
                  className="prose max-w-none"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}