import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Get user from token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token', 
        authError: authError?.message 
      }, { status: 401 });
    }

    // Get tenant ID from domain
    const host = request.headers.get('host') || '';
    const tenantId = getTenantIdFromDomain(host);

    // Determine role based on email
    const role = user.email?.includes('ceo') ? 'CEO' : 
                 user.email?.includes('admin') ? 'Admin' : 'Analyst';

    // Try to upsert the user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: user.id,  // Reference auth.users via user_id field
        tenant_id: tenantId,
        email: user.email!,
        full_name: user.user_metadata?.full_name || 
                   (user.email?.includes('ceo') ? 'CEO SIGA' : 
                    user.email?.includes('admin') ? 'Admin User' : 'User'),
        role: role,
        is_active: true
      }, { 
        onConflict: 'user_id',  // Use user_id for conflict resolution
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return NextResponse.json({ 
        error: 'Failed to create/update profile',
        details: profileError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Profile created/updated successfully',
      profile,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      }
    });

  } catch (error) {
    console.error('Profile setup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}