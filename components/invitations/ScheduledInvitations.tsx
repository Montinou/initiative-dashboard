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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { format, addDays, parseISO, isFuture, isPast } from 'date-fns';
import {
  CalendarIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Timer,
  Mail
} from 'lucide-react';

interface ScheduledInvitation {
  id: string;
  emails: string[];
  role: string;
  areaId?: string;
  areaName?: string;
  scheduledFor: string;
  customMessage?: string;
  batchName?: string;
  status: 'pending' | 'processing' | 'sent' | 'cancelled';
  createdBy: {
    full_name: string;
    email: string;
  };
  createdAt: string;
}

interface ScheduledInvitationsProps {
  userProfile: any;
  areas: any[];
}

export default function ScheduledInvitations({ userProfile, areas }: ScheduledInvitationsProps) {
  const [scheduledInvitations, setScheduledInvitations] = useState<ScheduledInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [scheduleForm, setScheduleForm] = useState({
    emails: [] as string[],
    emailInput: '',
    role: 'Manager',
    areaId: '',
    customMessage: '',
    batchName: ''
  });

  const supabase = createClient();
  const isCEO = userProfile.role === 'CEO';

  useEffect(() => {
    fetchScheduledInvitations();
    const interval = setInterval(fetchScheduledInvitations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchScheduledInvitations = async () => {
    setLoading(true);
    try {
      // For this demo, we'll simulate scheduled invitations
      // In production, this would fetch from a scheduled_invitations table
      const mockData: ScheduledInvitation[] = [
        {
          id: '1',
          emails: ['john@example.com', 'jane@example.com'],
          role: 'Manager',
          areaId: areas[0]?.id,
          areaName: areas[0]?.name,
          scheduledFor: addDays(new Date(), 2).toISOString(),
          customMessage: 'Welcome to our Q2 hiring batch!',
          batchName: 'Q2 2025 New Hires',
          status: 'pending',
          createdBy: {
            full_name: userProfile.full_name,
            email: userProfile.email
          },
          createdAt: new Date().toISOString()
        }
      ];

      setScheduledInvitations(mockData);
    } catch (error) {
      console.error('Failed to fetch scheduled invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduled invitations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInvitations = async () => {
    if (scheduleForm.emails.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one email address',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Please select a date and time',
        variant: 'destructive'
      });
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (!isFuture(scheduledDateTime)) {
      toast({
        title: 'Error',
        description: 'Scheduled time must be in the future',
        variant: 'destructive'
      });
      return;
    }

    try {
      // In production, this would create a scheduled job
      const newScheduled: ScheduledInvitation = {
        id: Date.now().toString(),
        emails: scheduleForm.emails,
        role: scheduleForm.role,
        areaId: scheduleForm.areaId,
        areaName: areas.find(a => a.id === scheduleForm.areaId)?.name,
        scheduledFor: scheduledDateTime.toISOString(),
        customMessage: scheduleForm.customMessage,
        batchName: scheduleForm.batchName || `Scheduled for ${format(scheduledDateTime, 'PPP')}`,
        status: 'pending',
        createdBy: {
          full_name: userProfile.full_name,
          email: userProfile.email
        },
        createdAt: new Date().toISOString()
      };

      setScheduledInvitations([...scheduledInvitations, newScheduled]);

      toast({
        title: 'Success',
        description: `${scheduleForm.emails.length} invitations scheduled for ${format(scheduledDateTime, 'PPP p')}`,
        variant: 'success'
      });

      // Reset form
      setScheduleForm({
        emails: [],
        emailInput: '',
        role: 'Manager',
        areaId: '',
        customMessage: '',
        batchName: ''
      });
      setSelectedDate(addDays(new Date(), 1));
      setSelectedTime('09:00');
      setIsScheduleModalOpen(false);
    } catch (error) {
      console.error('Failed to schedule invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule invitations',
        variant: 'destructive'
      });
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled batch?')) {
      return;
    }

    try {
      setScheduledInvitations(scheduledInvitations.map(inv => 
        inv.id === id ? { ...inv, status: 'cancelled' } : inv
      ));

      toast({
        title: 'Success',
        description: 'Scheduled invitations cancelled',
        variant: 'success'
      });
    } catch (error) {
      console.error('Failed to cancel scheduled invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel scheduled invitations',
        variant: 'destructive'
      });
    }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm('Send these invitations immediately?')) {
      return;
    }

    try {
      setScheduledInvitations(scheduledInvitations.map(inv => 
        inv.id === id ? { ...inv, status: 'processing' } : inv
      ));

      // Simulate sending
      setTimeout(() => {
        setScheduledInvitations(prev => prev.map(inv => 
          inv.id === id ? { ...inv, status: 'sent' } : inv
        ));

        toast({
          title: 'Success',
          description: 'Invitations sent successfully',
          variant: 'success'
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to send invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitations',
        variant: 'destructive'
      });
    }
  };

  const addEmailsToSchedule = () => {
    const emailsToAdd = scheduleForm.emailInput
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const newEmails = emailsToAdd.filter(e => !scheduleForm.emails.includes(e));
    
    if (newEmails.length > 0) {
      setScheduleForm({
        ...scheduleForm,
        emails: [...scheduleForm.emails, ...newEmails],
        emailInput: ''
      });
    }
  };

  const removeEmailFromSchedule = (email: string) => {
    setScheduleForm({
      ...scheduleForm,
      emails: scheduleForm.emails.filter(e => e !== email)
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'pending': <Badge variant="secondary">Pending</Badge>,
      'processing': <Badge className="bg-blue-100 text-blue-800">Processing</Badge>,
      'sent': <Badge variant="success">Sent</Badge>,
      'cancelled': <Badge variant="destructive">Cancelled</Badge>
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const availableRoles = isCEO 
    ? ['CEO', 'Admin', 'Manager']
    : ['Admin', 'Manager'];

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Invitations</CardTitle>
              <CardDescription>
                Schedule invitations to be sent at specific times
              </CardDescription>
            </div>
            <Button onClick={() => setIsScheduleModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Timer className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading scheduled invitations...</p>
            </div>
          ) : scheduledInvitations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No scheduled invitations</p>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule invitations to be sent automatically at future dates
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledInvitations.map((scheduled) => (
                  <TableRow key={scheduled.id}>
                    <TableCell className="font-medium">
                      {scheduled.batchName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{scheduled.emails.length} users</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{scheduled.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(scheduled.scheduledFor), 'PPP')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(scheduled.scheduledFor), 'p')}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(scheduled.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {scheduled.createdBy.full_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {scheduled.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendNow(scheduled.id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancelScheduled(scheduled.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {scheduled.status === 'processing' && (
                        <Badge variant="outline">
                          <Timer className="w-3 h-3 mr-1 animate-spin" />
                          Sending...
                        </Badge>
                      )}
                      {scheduled.status === 'sent' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {scheduled.status === 'cancelled' && (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Invitations</DialogTitle>
            <DialogDescription>
              Set up invitations to be sent automatically at a future date and time
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date and Time Selection */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isPast(date) || date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Batch Details */}
            <div className="space-y-2">
              <Label>Batch Name (Optional)</Label>
              <Input
                placeholder="e.g., Q2 2025 Engineering Hires"
                value={scheduleForm.batchName}
                onChange={(e) => setScheduleForm({...scheduleForm, batchName: e.target.value})}
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label>Email Addresses</Label>
              <Textarea
                placeholder="Enter email addresses separated by commas, semicolons, or new lines"
                value={scheduleForm.emailInput}
                onChange={(e) => setScheduleForm({...scheduleForm, emailInput: e.target.value})}
                rows={3}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addEmailsToSchedule}
                disabled={!scheduleForm.emailInput.trim()}
              >
                Add Emails
              </Button>
            </div>

            {/* Email List */}
            {scheduleForm.emails.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email List ({scheduleForm.emails.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScheduleForm({...scheduleForm, emails: []})}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {scheduleForm.emails.map((email) => (
                      <Badge key={email} variant="secondary" className="pr-1">
                        {email}
                        <button
                          onClick={() => removeEmailFromSchedule(email)}
                          className="ml-2 hover:text-red-600"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Role and Area */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={scheduleForm.role}
                  onValueChange={(value) => setScheduleForm({...scheduleForm, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Area (Optional)</Label>
                <Select
                  value={scheduleForm.areaId || 'none'}
                  onValueChange={(value) => setScheduleForm({...scheduleForm, areaId: value === 'none' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No area</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label>Custom Message (Optional)</Label>
              <Textarea
                placeholder="Add a personalized message to the invitation"
                value={scheduleForm.customMessage}
                onChange={(e) => setScheduleForm({...scheduleForm, customMessage: e.target.value})}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {scheduleForm.customMessage.length}/500 characters
              </p>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && scheduleForm.emails.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">
                      Scheduling {scheduleForm.emails.length} invitation{scheduleForm.emails.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-blue-700">
                      Will be sent on {format(selectedDate, 'PPPP')} at {selectedTime}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScheduleInvitations}
              disabled={scheduleForm.emails.length === 0 || !selectedDate || !selectedTime}
            >
              <Clock className="w-4 h-4 mr-2" />
              Schedule Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}