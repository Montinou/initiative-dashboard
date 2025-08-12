'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { 
  Upload, 
  X, 
  Mail, 
  AlertCircle, 
  Users,
  FileText,
  CheckCircle
} from 'lucide-react';

interface BulkInviteModalProps {
  open: boolean;
  onClose: () => void;
  userProfile: any;
  areas: any[];
  maxInvites: number;
  onSuccess: () => void;
}

export default function BulkInviteModal({
  open,
  onClose,
  userProfile,
  areas,
  maxInvites,
  onSuccess
}: BulkInviteModalProps) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<string>('Manager');
  const [areaId, setAreaId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [batchName, setBatchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const supabase = createClient();
  const isCEO = userProfile.role === 'CEO';

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleAddEmail = () => {
    const emailsToAdd = emailInput
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const newEmails: string[] = [];
    const errors: string[] = [];

    emailsToAdd.forEach(email => {
      if (!validateEmail(email)) {
        errors.push(`Invalid email: ${email}`);
      } else if (emails.includes(email)) {
        errors.push(`Duplicate email: ${email}`);
      } else if (emails.length + newEmails.length >= maxInvites) {
        errors.push(`Maximum ${maxInvites} invitations allowed`);
      } else {
        newEmails.push(email);
      }
    });

    if (newEmails.length > 0) {
      setEmails([...emails, ...newEmails]);
      setEmailInput('');
    }
    
    setValidationErrors(errors);
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const emailList: string[] = [];
      const errors: string[] = [];

      lines.forEach((line, index) => {
        const email = line.trim();
        if (email) {
          if (!validateEmail(email)) {
            errors.push(`Line ${index + 1}: Invalid email ${email}`);
          } else if (!emailList.includes(email)) {
            if (emailList.length < maxInvites) {
              emailList.push(email);
            } else {
              errors.push(`Maximum ${maxInvites} invitations reached`);
            }
          }
        }
      });

      setEmails(emailList);
      setValidationErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (emails.length === 0) {
      setValidationErrors(['Please add at least one email']);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      const session = await supabase.auth.getSession();
      
      const response = await fetch('/api/invitations/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify({
          emails,
          role,
          areaId: areaId || null,
          customMessage,
          batchName: batchName || `Bulk invitation - ${new Date().toLocaleDateString()}`,
          sendImmediately: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      // Show success message
      toast({
        title: 'Invitations Sent',
        description: `Successfully sent ${data.summary.sent} of ${data.summary.total} invitations`,
        variant: data.summary.failed > 0 ? 'warning' : 'success'
      });

      // Show details of failed invitations if any
      if (data.summary.failed > 0) {
        const failedEmails = data.results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.email}: ${r.error}`)
          .join('\n');
        
        console.error('Failed invitations:', failedEmails);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Bulk invite error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitations',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmails([]);
    setEmailInput('');
    setRole('Manager');
    setAreaId('');
    setCustomMessage('');
    setBatchName('');
    setValidationErrors([]);
    setMode('manual');
    onClose();
  };

  const availableRoles = isCEO 
    ? ['CEO', 'Admin', 'Manager']
    : ['Admin', 'Manager'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Invite Users</DialogTitle>
          <DialogDescription>
            Send invitations to multiple users at once (max {maxInvites})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Mail className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileText className="w-4 h-4 mr-2" />
              CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                placeholder="Enter email addresses separated by commas, semicolons, or new lines"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                rows={3}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                disabled={!emailInput.trim()}
              >
                Add Emails
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload a CSV file with one email per line
                </p>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSVUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Email List */}
        {emails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email List ({emails.length}/{maxInvites})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmails([])}
              >
                Clear All
              </Button>
            </div>
            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="pr-1">
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Area (Optional)</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No area</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Batch Name (Optional)</Label>
          <Input
            placeholder="e.g., Q1 2025 New Hires"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Custom Message (Optional)</Label>
          <Textarea
            placeholder="Add a personalized message to the invitation email"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {customMessage.length}/500 characters
          </p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>...and {validationErrors.length - 5} more errors</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary */}
        {emails.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Ready to send {emails.length} invitation{emails.length > 1 ? 's' : ''} as {role}
              {areaId && ` to ${areas.find(a => a.id === areaId)?.name}`}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || emails.length === 0}
          >
            {isSubmitting ? (
              <>Sending...</>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Send {emails.length} Invitation{emails.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}