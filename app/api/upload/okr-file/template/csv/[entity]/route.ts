import { NextRequest, NextResponse } from 'next/server';
import { TemplateGenerator } from '@/services/templateGenerator';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to download templates.' },
        { status: 401 }
      );
    }
    
    // Get user profile to check permissions
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
    
    const entity = params.entity;
    
    // Validate entity type
    const validEntities = TemplateGenerator.getAvailableEntityTypes();
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Invalid entity type. Valid types: ${validEntities.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate CSV template
    const csvContent = TemplateGenerator.generateCSVTemplate(entity);
    
    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="okr_${entity}_template.csv"`,
      },
    });
  } catch (error) {
    logger.error('Error generating CSV template:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV template' },
      { status: 500 }
    );
  }
}