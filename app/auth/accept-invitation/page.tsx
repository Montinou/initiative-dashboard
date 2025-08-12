/**
 * Invitation Acceptance Page
 * Handles token validation, user registration/linking, and onboarding initiation
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import InvitationAcceptanceFlow from '@/components/invitation/InvitationAcceptanceFlow';
import InvitationExpired from '@/components/invitation/InvitationExpired';
import InvitationAlreadyAccepted from '@/components/invitation/InvitationAlreadyAccepted';
import InvitationInvalid from '@/components/invitation/InvitationInvalid';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface PageProps {
  searchParams: {
    token?: string;
    error?: string;
  };
}

/**
 * Validate invitation token and get invitation details
 */
async function validateInvitation(token: string) {
  const supabase = await createClient();
  
  // Fetch invitation by token
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(`
      *,
      tenant:tenants!invitations_tenant_id_fkey(
        id,
        subdomain,
        organization:organizations!tenants_organization_id_fkey(
          id,
          name,
          logo_url,
          primary_color,
          secondary_color
        )
      ),
      area:areas!invitations_area_id_fkey(
        id,
        name,
        description
      ),
      sender:user_profiles!invitations_sent_by_fkey(
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return { valid: false, error: 'invalid_token' };
  }

  // Check if invitation has expired
  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  if (expiresAt < now) {
    return { valid: false, error: 'expired', invitation };
  }

  // Check if invitation is already accepted
  if (invitation.status === 'accepted') {
    return { valid: false, error: 'already_accepted', invitation };
  }

  // Check if invitation was cancelled
  if (invitation.status === 'cancelled') {
    return { valid: false, error: 'cancelled', invitation };
  }

  // Check if user already exists with this email
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is logged in - check if it's the right email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (userProfile) {
      if (userProfile.email !== invitation.email) {
        // Wrong user is logged in
        return { 
          valid: false, 
          error: 'wrong_user', 
          invitation,
          currentEmail: userProfile.email 
        };
      }

      if (userProfile.tenant_id === invitation.tenant_id) {
        // User already belongs to this organization
        return { 
          valid: false, 
          error: 'already_member', 
          invitation 
        };
      }
    }
  }

  // Check if a user exists with this email in any tenant
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id, tenant_id, user_id')
    .eq('email', invitation.email)
    .single();

  return {
    valid: true,
    invitation,
    existingUser: user,
    existingProfile,
    needsRegistration: !existingProfile?.user_id
  };
}

/**
 * Track invitation view event
 */
async function trackInvitationView(invitationId: string) {
  const supabase = await createClient();
  
  try {
    // Track that the invitation was viewed
    await supabase.rpc('track_invitation_event', {
      p_invitation_id: invitationId,
      p_event_type: 'clicked',
      p_metadata: {
        timestamp: new Date().toISOString(),
        source: 'email_link'
      }
    });

    // Update clicked timestamp if not already set
    await supabase
      .from('invitations')
      .update({ 
        email_clicked_at: new Date().toISOString() 
      })
      .eq('id', invitationId)
      .is('email_clicked_at', null);
  } catch (error) {
    console.error('Failed to track invitation view:', error);
  }
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { token, error } = searchParams;

  // Handle error from auth callback
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error === 'access_denied' && 'Access was denied. Please try again.'}
              {error === 'server_error' && 'A server error occurred. Please try again later.'}
              {error !== 'access_denied' && error !== 'server_error' && 'An error occurred during authentication.'}
            </p>
            <a
              href="/"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
            >
              Return to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Validate token parameter
  if (!token) {
    return <InvitationInvalid message="No invitation token provided" />;
  }

  // Validate token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return <InvitationInvalid message="Invalid invitation token format" />;
  }

  // Validate the invitation
  const validation = await validateInvitation(token);

  // Track that someone clicked the invitation link
  if (validation.invitation) {
    await trackInvitationView(validation.invitation.id);
  }

  // Handle validation errors
  if (!validation.valid) {
    switch (validation.error) {
      case 'expired':
        return <InvitationExpired invitation={validation.invitation} />;
      
      case 'already_accepted':
        return <InvitationAlreadyAccepted invitation={validation.invitation} />;
      
      case 'cancelled':
        return (
          <InvitationInvalid 
            message="This invitation has been cancelled" 
            invitation={validation.invitation}
          />
        );
      
      case 'wrong_user':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900">
                  Wrong Account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  You're currently logged in as <strong>{validation.currentEmail}</strong>, 
                  but this invitation is for <strong>{validation.invitation?.email}</strong>.
                </p>
                <div className="mt-6 space-y-3">
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Sign out and continue
                    </button>
                  </form>
                  <a
                    href="/"
                    className="block text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'already_member':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900">
                  Already a Member
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  You're already a member of {validation.invitation?.tenant.organization.name}.
                </p>
                <a
                  href="/dashboard"
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
                >
                  Go to dashboard
                </a>
              </div>
            </div>
          </div>
        );
      
      case 'invalid_token':
      default:
        return <InvitationInvalid message="Invalid or expired invitation token" />;
    }
  }

  // Valid invitation - show acceptance flow
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <InvitationAcceptanceFlow
        invitation={validation.invitation}
        existingUser={validation.existingUser}
        existingProfile={validation.existingProfile}
        needsRegistration={validation.needsRegistration}
      />
    </Suspense>
  );
}