import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - List all templates for the tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    // Build query
    let query = supabase
      .from('invitation_templates')
      .select(`
        *,
        created_by:user_profiles!invitation_templates_created_by_fkey(full_name, email)
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('is_default', { ascending: false })
      .order('usage_count', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Failed to fetch templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });

  } catch (error: any) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEO and Admin can create templates
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      role,
      subject,
      htmlContent,
      textContent,
      variables,
      isActive = true,
      isDefault = false
    } = body;

    // Validate required fields
    if (!name || !role || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields: name, role, subject, htmlContent' },
        { status: 400 }
      );
    }

    // Create the template
    const { data: template, error: createError } = await supabase
      .from('invitation_templates')
      .insert({
        tenant_id: userProfile.tenant_id,
        name,
        description,
        role,
        subject,
        html_content: htmlContent,
        text_content: textContent || stripHtml(htmlContent),
        variables: variables || extractVariables(htmlContent),
        is_active: isActive,
        is_default: isDefault,
        created_by: userProfile.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create template:', createError);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    // Log the creation
    await supabase
      .from('audit_log')
      .insert({
        user_id: userProfile.id,
        action: 'create',
        table_name: 'invitation_templates',
        record_id: template.id,
        new_data: template
      });

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template created successfully'
    });

  } catch (error: any) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update a template
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEO and Admin can update templates
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Get the existing template
    const { data: existing, error: fetchError } = await supabase
      .from('invitation_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.htmlContent !== undefined) {
      updateData.html_content = updates.htmlContent;
      updateData.text_content = updates.textContent || stripHtml(updates.htmlContent);
      updateData.variables = updates.variables || extractVariables(updates.htmlContent);
    }
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

    updateData.updated_at = new Date().toISOString();

    // Update the template
    const { data: template, error: updateError } = await supabase
      .from('invitation_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update template:', updateError);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    // Log the update
    await supabase
      .from('audit_log')
      .insert({
        user_id: userProfile.id,
        action: 'update',
        table_name: 'invitation_templates',
        record_id: id,
        old_data: existing,
        new_data: template
      });

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template updated successfully'
    });

  } catch (error: any) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEO and Admin can delete templates
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Check if template exists and is not default
    const { data: template, error: fetchError } = await supabase
      .from('invitation_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.is_default) {
      return NextResponse.json({ error: 'Cannot delete default template' }, { status: 400 });
    }

    // Delete the template
    const { error: deleteError } = await supabase
      .from('invitation_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete template:', deleteError);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    // Log the deletion
    await supabase
      .from('audit_log')
      .insert({
        user_id: userProfile.id,
        action: 'delete',
        table_name: 'invitation_templates',
        record_id: id,
        old_data: template
      });

    return NextResponse.json({ 
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error: any) {
    console.error('Template deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to extract variables from template
function extractVariables(content: string): any[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim().replace('#if ', '').replace('/if', '');
    if (varName && !varName.startsWith('#') && !varName.startsWith('/')) {
      variables.add(varName);
    }
  }

  return Array.from(variables).map(name => ({
    name,
    required: false,
    description: `Variable: ${name}`
  }));
}