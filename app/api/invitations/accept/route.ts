/**
 * Accept Invitation API
 * Handles invitation acceptance, user profile creation, and tenant association
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const acceptInvitationSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
  userId: z.string().uuid('Invalid user ID').optional(),
  fullName: z.string().min(2, 'Name is required').optional(),
  phone: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validationResult = acceptInvitationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { token, userId, fullName, phone } = validationResult.data;
    const supabase = await createClient();

    // Fetch invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        tenant:tenants!invitations_tenant_id_fkey(
          id,
          subdomain,
          organization_id
        ),
        area:areas!invitations_area_id_fkey(
          id,
          name
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Validate invitation status
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }

    if (invitation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invitation has been cancelled' },
        { status: 400 }
      );
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Get or verify user
    let authUserId = userId;
    
    if (!authUserId) {
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && user) {
        authUserId = user.id;
        
        // Verify email matches
        if (user.email !== invitation.email) {
          return NextResponse.json(
            { error: 'Email does not match invitation' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'User authentication required' },
          { status: 401 }
        );
      }
    }

    // Check if user already has a profile in this tenant
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', authUserId)
      .eq('tenant_id', invitation.tenant_id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already belongs to this organization' },
        { status: 400 }
      );
    }

    // Begin transaction-like operations
    const operations = [];

    // 1. Create or update user in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .upsert({
        id: authUserId,
        email: invitation.email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Failed to create/update user record:', userError);
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      );
    }

    // 2. Create user profile in the invited tenant
    const profileData = {
      user_id: authUserId,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: fullName || invitation.email.split('@')[0],
      role: invitation.role,
      area_id: invitation.area_id,
      phone: phone || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      
      // Check if it's a unique constraint error
      if (profileError.code === '23505') {
        return NextResponse.json(
          { error: 'A profile already exists for this user' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // 3. Update invitation status
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: newProfile.id,
        updated_at: new Date().toISOString(),
        onboarding_started_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation:', updateError);
      // Don't fail the whole operation, but log the error
    }

    // 4. Track acceptance event
    await supabase.rpc('track_invitation_event', {
      p_invitation_id: invitation.id,
      p_event_type: 'accepted',
      p_metadata: {
        user_id: authUserId,
        profile_id: newProfile.id,
        accepted_at: new Date().toISOString()
      }
    }).catch(err => console.warn('Failed to track acceptance:', err));

    // 5. Update batch statistics if part of bulk invitation
    if (invitation.parent_invitation_id) {
      await supabase.rpc('increment', {
        table_name: 'invitation_batches',
        column_name: 'accepted_count',
        row_id: invitation.parent_invitation_id
      }).catch(err => console.warn('Failed to update batch stats:', err));
    }

    // 6. Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        user_id: newProfile.id,
        action: 'invitation_accepted',
        table_name: 'invitations',
        record_id: invitation.id,
        new_data: {
          invitation_id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          area_id: invitation.area_id
        },
        created_at: new Date().toISOString()
      })
      .catch(err => console.warn('Failed to create audit log:', err));

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        invitation_id: invitation.id,
        profile_id: newProfile.id,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        area_id: invitation.area_id,
        organization: {
          id: invitation.tenant.organization_id,
          subdomain: invitation.tenant.subdomain
        },
        onboarding_required: true
      }
    });

  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invitations/accept
 * Verify invitation token without accepting
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        custom_message,
        tenant:tenants!invitations_tenant_id_fkey(
          id,
          subdomain,
          organization:organizations!tenants_organization_id_fkey(
            id,
            name,
            logo_url
          )
        ),
        area:areas!invitations_area_id_fkey(
          id,
          name
        ),
        sender:user_profiles!invitations_sent_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check status
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    const status = {
      valid: invitation.status !== 'accepted' && invitation.status !== 'cancelled' && expiresAt > now,
      expired: expiresAt <= now,
      accepted: invitation.status === 'accepted',
      cancelled: invitation.status === 'cancelled'
    };

    return NextResponse.json({
      invitation: {
        ...invitation,
        token: undefined // Don't expose the token
      },
      status
    });

  } catch (error: any) {
    console.error('Verify invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}