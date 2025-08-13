import { NextRequest, NextResponse } from 'next/server';
import { TemplateGenerator } from '@/services/templateGenerator';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to view examples.' },
        { status: 401 }
      );
    }
    
    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    
    // Get example data
    const examples = TemplateGenerator.getExampleData(entity || undefined);
    
    return NextResponse.json(examples, { status: 200 });
  } catch (error) {
    logger.error('Error getting example data:', error);
    return NextResponse.json(
      { error: 'Failed to get example data' },
      { status: 500 }
    );
  }
}