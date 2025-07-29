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

export async function GET(request: NextRequest) {
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

    // Check user profile existence
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id);

    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, is_active')
      .limit(5);

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at
      },
      userProfiles: userProfile,
      profileError: profileError?.message,
      sampleProfiles: allProfiles,
      allError: allError?.message
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}