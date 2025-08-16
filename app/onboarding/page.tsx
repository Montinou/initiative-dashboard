/**
 * Onboarding Page
 * Multi-step onboarding flow for new users after accepting invitation
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

interface PageProps {
  searchParams: {
    invitation?: string;
    new?: string;
  };
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  // Get user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!user_profiles_tenant_id_fkey(
        id,
        subdomain,
        organization:organizations!tenants_organization_id_fkey(
          id,
          name,
          description,
          logo_url,
          website,
          primary_color,
          secondary_color
        )
      ),
      area:areas!user_profiles_area_id_fkey(
        id,
        name,
        description,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (profileError || !userProfile) {
    console.error('Failed to fetch user profile:', profileError);
    redirect('/');
  }

  // Check if onboarding is needed
  const needsOnboarding = !userProfile.onboarding_completed_at || searchParams.new === 'true';
  
  if (!needsOnboarding && !searchParams.invitation) {
    // User has already completed onboarding
    redirect('/dashboard');
  }

  // Fetch invitation details if provided
  let invitationData = null;
  if (searchParams.invitation) {
    const { data: invitation } = await supabase
      .from('invitations')
      .select(`
        *,
        sender:user_profiles!invitations_sent_by_fkey(
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      `)
      .eq('id', searchParams.invitation)
      .eq('accepted_by', userProfile.id)
      .single();

    invitationData = invitation;

    // Update onboarding started timestamp
    if (invitation && !invitation.onboarding_started_at) {
      await supabase
        .from('invitations')
        .update({ 
          onboarding_started_at: new Date().toISOString() 
        })
        .eq('id', invitation.id);
    }
  }

  // Get team members if user has an area assigned
  let teamMembers = [];
  if (userProfile.area_id) {
    const { data: team } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, avatar_url')
      
      .eq('area_id', userProfile.area_id)
      .neq('id', userProfile.id)
      .eq('is_active', true)
      .limit(10);

    teamMembers = team || [];
  }

  // Get initial tasks/initiatives for the user's area
  let initialTasks = [];
  if (userProfile.area_id) {
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select(`
        id,
        title,
        description,
        progress,
        due_date,
        activities:activities(count)
      `)
      
      .eq('area_id', userProfile.area_id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(3);

    initialTasks = initiatives || [];
  }

  return (
    <OnboardingFlow
      userProfile={userProfile}
      invitation={invitationData}
      teamMembers={teamMembers}
      initialTasks={initialTasks}
      isNewUser={searchParams.new === 'true'}
    />
  );
}