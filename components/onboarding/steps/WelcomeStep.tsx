'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Target, TrendingUp } from 'lucide-react';

interface WelcomeStepProps {
  userProfile: any;
  invitation?: any;
  isNewUser: boolean;
  onNext: () => void;
}

export default function WelcomeStep({ 
  userProfile, 
  invitation, 
  isNewUser,
  onNext 
}: WelcomeStepProps) {
  const organizationName = userProfile.tenant?.organization?.name || 'our organization';
  const inviterName = invitation?.sender?.full_name || invitation?.sender?.email;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to {organizationName}, {userProfile.full_name || userProfile.email}!
        </h1>
        
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {isNewUser ? (
            <>We're thrilled to have you join our team as a <strong>{userProfile.role}</strong>.</>
          ) : (
            <>Welcome back! Let's get you set up in your new role as a <strong>{userProfile.role}</strong>.</>
          )}
        </p>

        {inviterName && (
          <p className="mt-3 text-gray-600">
            {inviterName} invited you to join the team.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">What's ahead in your onboarding:</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Complete Your Profile</h3>
                <p className="text-sm text-gray-600">
                  Add your photo and tell us a bit about yourself
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Meet Your Team</h3>
                <p className="text-sm text-gray-600">
                  Get to know the people you'll be working with
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Review Your First Tasks</h3>
                <p className="text-sm text-gray-600">
                  See what initiatives and activities you'll be involved in
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Start Contributing</h3>
                <p className="text-sm text-gray-600">
                  Jump right in and start making an impact
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {userProfile.area && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              You've been assigned to: {userProfile.area.name}
            </h3>
            {userProfile.area.description && (
              <p className="text-sm text-gray-600">
                {userProfile.area.description}
              </p>
            )}
            {userProfile.area.manager && (
              <p className="text-sm text-gray-600 mt-2">
                Your manager is: <strong>{userProfile.area.manager.full_name}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          This will only take a few minutes
        </p>
      </div>
    </div>
  );
}