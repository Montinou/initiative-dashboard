/**
 * Complete Onboarding API
 * Marks user's onboarding as complete and updates profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const completeOnboardingSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  invitationId: z.string().uuid('Invalid invitation ID').optional(),
  profileUpdates: z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    bio: z.string().optional(),
    preferences: z.record(z.any()).optional()
  }).optional(),
  completedSteps: z.array(z.number()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = completeOnboardingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { profileId, invitationId, profileUpdates, completedSteps } = validationResult.data;
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify profile belongs to user
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, tenant_id')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        { status: 404 }
      );
    }

    // Update user profile with onboarding completion
    const profileUpdateData: any = {
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add optional profile updates
    if (profileUpdates) {
      if (profileUpdates.fullName) {
        profileUpdateData.full_name = profileUpdates.fullName;
      }
      if (profileUpdates.phone !== undefined) {
        profileUpdateData.phone = profileUpdates.phone;
      }
      if (profileUpdates.avatar !== undefined) {
        profileUpdateData.avatar_url = profileUpdates.avatar;
      }
      if (profileUpdates.bio || profileUpdates.preferences) {
        profileUpdateData.metadata = {
          ...(profileUpdates.bio && { bio: profileUpdates.bio }),
          ...(profileUpdates.preferences && { preferences: profileUpdates.preferences }),
          onboarding_completed_steps: completedSteps || []
        };
      }
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(profileUpdateData)
      .eq('id', profileId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Update invitation if provided
    if (invitationId) {
      const { error: invitationError } = await supabase
        .from('invitations')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('accepted_by', profileId);

      if (invitationError) {
        console.warn('Failed to update invitation:', invitationError);
        // Don't fail the whole operation
      }

      // Track onboarding completion event
      await supabase.rpc('track_invitation_event', {
        p_invitation_id: invitationId,
        p_event_type: 'onboarding_completed',
        p_metadata: {
          profile_id: profileId,
          completed_at: new Date().toISOString(),
          steps_completed: completedSteps || []
        }
      }).catch(err => console.warn('Failed to track event:', err));
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        user_id: profileId,
        action: 'onboarding_completed',
        table_name: 'user_profiles',
        record_id: profileId,
        new_data: {
          onboarding_completed: true,
          invitation_id: invitationId,
          completed_steps: completedSteps
        },
        created_at: new Date().toISOString()
      })
      .catch(err => console.warn('Failed to create audit log:', err));

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        profile_id: profileId,
        onboarding_completed_at: profileUpdateData.onboarding_completed_at
      }
    });

  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}