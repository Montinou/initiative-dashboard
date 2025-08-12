'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Shield, User, Users, AlertCircle } from 'lucide-react';

// Registration form schema
const registrationSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface InvitationAcceptanceFlowProps {
  invitation: any;
  existingUser: any;
  existingProfile: any;
  needsRegistration: boolean;
}

export default function InvitationAcceptanceFlow({
  invitation,
  existingUser,
  existingProfile,
  needsRegistration
}: InvitationAcceptanceFlowProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'welcome' | 'register' | 'processing'>('welcome');
  
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: invitation.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    }
  });

  /**
   * Accept invitation for existing user
   */
  const handleAcceptForExistingUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call API to accept invitation
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invitation.token,
          userId: existingUser?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Redirect to onboarding or dashboard
      router.push(`/onboarding?invitation=${invitation.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  /**
   * Register new user and accept invitation
   */
  const handleRegistration = async (formData: RegistrationFormData) => {
    setIsLoading(true);
    setError(null);
    setStep('processing');

    try {
      // Step 1: Create user account with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            invitation_id: invitation.id
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Accept invitation via API
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invitation.token,
          userId: authData.user.id,
          fullName: formData.fullName,
          phone: formData.phone
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        // If invitation acceptance fails, we should clean up the auth user
        // But for now, just throw the error
        throw new Error(responseData.error || 'Failed to accept invitation');
      }

      // Step 3: Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: formData.password
      });

      if (signInError) {
        throw signInError;
      }

      // Step 4: Redirect to onboarding
      router.push(`/onboarding?invitation=${invitation.id}&new=true`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      setStep('register');
    }
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader className="text-center pb-2">
            {invitation.tenant.organization.logo_url && (
              <img 
                src={invitation.tenant.organization.logo_url} 
                alt={invitation.tenant.organization.name}
                className="h-16 mx-auto mb-4"
              />
            )}
            <CardTitle className="text-2xl">
              Welcome to {invitation.tenant.organization.name}!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              You've been invited to join as a <strong>{invitation.role}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Invited by</p>
                  <p className="font-medium">
                    {invitation.sender.full_name || invitation.sender.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Invitation for</p>
                  <p className="font-medium">{invitation.email}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="font-medium">{invitation.role}</p>
                </div>
              </div>
              
              {invitation.area && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Team/Area</p>
                    <p className="font-medium">{invitation.area.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Message */}
            {invitation.custom_message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 italic">
                  "{invitation.custom_message}"
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  - {invitation.sender.full_name || invitation.sender.email}
                </p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {needsRegistration ? (
                <Button
                  onClick={() => setStep('register')}
                  className="w-full"
                  size="lg"
                >
                  Continue to Registration
                </Button>
              ) : (
                <Button
                  onClick={handleAcceptForExistingUser}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Processing...' : 'Accept Invitation'}
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Decline
              </Button>
            </div>

            {/* Footer */}
            <p className="text-xs text-center text-gray-500">
              This invitation expires in{' '}
              {Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration step
  if (step === 'register' || step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Set up your account to join {invitation.tenant.organization.name}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(handleRegistration)} className="space-y-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              {/* Phone (optional) */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+1 (555) 123-4567"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Create a strong password"
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  At least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Creating Account...' : 'Create Account & Accept Invitation'}
              </Button>

              {/* Back Button */}
              {!isLoading && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('welcome')}
                  className="w-full"
                >
                  Back
                </Button>
              )}
            </form>

            {/* Processing Message */}
            {step === 'processing' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 text-center">
                  Setting up your account... This may take a moment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}