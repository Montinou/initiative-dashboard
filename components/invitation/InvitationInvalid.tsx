'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Mail } from 'lucide-react';

interface InvitationInvalidProps {
  message?: string;
  invitation?: any;
}

export default function InvitationInvalid({ message, invitation }: InvitationInvalidProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
          <CardDescription>
            {message || 'This invitation link is not valid'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              This could happen for several reasons:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc list-inside">
              <li>The invitation link is incorrect or incomplete</li>
              <li>The invitation has been cancelled</li>
              <li>The link has already been used</li>
              <li>There was a technical issue</li>
            </ul>
          </div>

          {invitation?.sender && (
            <div className="space-y-3">
              <p className="text-sm text-center text-gray-600">
                If you believe this is an error, please contact the person who invited you:
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = `mailto:${invitation.sender.email}`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact {invitation.sender.full_name || invitation.sender.email}
              </Button>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            <p className="text-sm text-center text-gray-600">
              Need help? Contact your organization's administrator for assistance.
            </p>
            
            <a
              href="/"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              Return to homepage
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}