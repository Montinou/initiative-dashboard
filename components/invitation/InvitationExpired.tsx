'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface InvitationExpiredProps {
  invitation?: any;
}

export default function InvitationExpired({ invitation }: InvitationExpiredProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestNewInvitation = async () => {
    if (!invitation) return;
    
    setIsRequesting(true);
    setError(null);

    try {
      // In a real implementation, this would send a request to notify the inviter
      const response = await fetch('/api/invitations/request-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          invitationId: invitation.id,
          email: invitation.email 
        })
      });

      if (response.ok) {
        setRequestSent(true);
      } else {
        throw new Error('Failed to send request');
      }
    } catch (err) {
      setError('Unable to send request. Please contact your administrator directly.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Invitation Expired</CardTitle>
          <CardDescription>
            This invitation link has expired and is no longer valid
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {invitation && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Organization:</span>{' '}
                {invitation.tenant?.organization?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Invited by:</span>{' '}
                {invitation.sender?.full_name || invitation.sender?.email || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Expired on:</span>{' '}
                {new Date(invitation.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!requestSent ? (
            <div className="space-y-3">
              <Button
                onClick={handleRequestNewInvitation}
                disabled={isRequesting || !invitation}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isRequesting ? 'Requesting...' : 'Request New Invitation'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <p className="text-sm text-center text-gray-600">
                Contact your administrator or the person who invited you to request a new invitation link.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                ✓ Request sent successfully!
              </p>
              <p className="text-sm text-green-700 mt-2">
                The inviter has been notified about your request. You should receive a new invitation link soon.
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <a
              href="/"
              className="block text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Return to homepage
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}