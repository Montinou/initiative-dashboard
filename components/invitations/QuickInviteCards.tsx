'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Crown, Shield, Users, Mail, Plus, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';

interface QuickInviteCardsProps {
  userProfile: any;
  areas: any[];
  allowedRoles: string[];
  onInviteSent: () => void;
}

interface QuickInviteData {
  email: string;
  areaId: string;
  customMessage: string;
}

export default function QuickInviteCards({
  userProfile,
  areas,
  allowedRoles,
  onInviteSent
}: QuickInviteCardsProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<QuickInviteData>({
    email: '',
    areaId: '',
    customMessage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();
  const t = useTranslations('invitations');
  const { session } = useAuth();
  
  // Add null check for userProfile
  if (!userProfile || !userProfile.tenant_id) {
    console.error('QuickInviteCards: Invalid userProfile', userProfile);
    return null;
  }

  const roleCards = [
    {
      role: 'CEO',
      title: `Invite ${t('quickInvite.ceo')}`,
      description: 'Add a chief executive to lead the organization',
      icon: Crown,
      color: 'bg-primary',
      lightColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      available: allowedRoles.includes('CEO')
    },
    {
      role: 'Admin',
      title: `Invite ${t('quickInvite.admin')}`,
      description: 'Add an administrator with full system access',
      icon: Shield,
      color: 'bg-accent',
      lightColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
      available: allowedRoles.includes('Admin')
    },
    {
      role: 'Manager',
      title: `Invite ${t('quickInvite.manager')}`,
      description: 'Add a manager to oversee specific areas',
      icon: Users,
      color: 'bg-secondary',
      lightColor: 'bg-secondary/10',
      borderColor: 'border-secondary/20',
      available: allowedRoles.includes('Manager')
    }
  ];

  const handleQuickInvite = async () => {
    if (!selectedRole || !inviteData.email) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/invitations/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: selectedRole,
          areaId: inviteData.areaId === "none" ? null : inviteData.areaId || null,
          customMessage: inviteData.customMessage,
          sendImmediately: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast({
        title: 'Invitation Sent',
        description: `Successfully invited ${inviteData.email} as ${selectedRole}`,
        variant: 'success'
      });

      // Reset form
      setInviteData({ email: '', areaId: '', customMessage: '' });
      setSelectedRole(null);
      onInviteSent();
    } catch (error: any) {
      console.error('Quick invite error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('quickInvite.title')}</h3>
          <p className="text-sm text-muted-foreground">
            Send an invitation with one click
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {roleCards.map((card) => {
            const Icon = card.icon;
            
            if (!card.available) {
              return (
                <Card key={card.role} className="opacity-50 cursor-not-allowed">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${card.lightColor} 
                      flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">
                      You don't have permission to invite this role
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            }
            
            return (
              <Card 
                key={card.role}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRole === card.role ? card.borderColor + ' border-2' : ''
                }`}
                onClick={() => setSelectedRole(card.role)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${
                    selectedRole === card.role ? card.color : card.lightColor
                  } flex items-center justify-center mb-3 transition-all`}>
                    <Icon className={`w-6 h-6 ${
                      selectedRole === card.role ? 'text-primary-foreground' : 'text-foreground'
                    }`} />
                  </div>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="sm" 
                    variant={selectedRole === card.role ? 'default' : 'outline'}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRole(card.role);
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Quick Invite
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Invite Dialog */}
      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Invite - {selectedRole}</DialogTitle>
            <DialogDescription>
              Send an invitation to join as {selectedRole}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                required
              />
            </div>

            {selectedRole === 'Manager' && (
              <div className="space-y-2">
                <Label htmlFor="area">Area (Optional)</Label>
                <Select 
                  value={inviteData.areaId} 
                  onValueChange={(value) => setInviteData({...inviteData, areaId: value})}
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific area</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal touch to your invitation..."
                value={inviteData.customMessage}
                onChange={(e) => setInviteData({...inviteData, customMessage: e.target.value})}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {inviteData.customMessage.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRole(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleQuickInvite}
              disabled={!inviteData.email || isSubmitting}
            >
              {isSubmitting ? (
                <>Sending...</>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}