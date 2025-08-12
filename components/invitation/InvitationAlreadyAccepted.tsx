'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InvitationAlreadyAcceptedProps {
  invitation?: any;
}

export default function InvitationAlreadyAccepted({ invitation }: InvitationAlreadyAcceptedProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Already Accepted</CardTitle>
          <CardDescription>
            This invitation has already been accepted
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {invitation && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Organization:</span>{' '}
                {invitation.tenant?.organization?.name || 'Your organization'}
              </p>
              {invitation.accepted_at && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Accepted on:</span>{' '}
                  {new Date(invitation.accepted_at).toLocaleDateString()}
                </p>
              )}
              {invitation.acceptedBy && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Accepted by:</span>{' '}
                  {invitation.acceptedBy.full_name || invitation.acceptedBy.email}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Your Account
            </Button>

            <p className="text-sm text-center text-gray-600">
              If you're having trouble accessing your account, please contact your administrator.
            </p>
          </div>

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