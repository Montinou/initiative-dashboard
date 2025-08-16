/**
 * File Listing API Route
 * Handles secure file listing with filtering, pagination, and role-based access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateRequest } from '@/lib/api-auth-helper';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface FileListQuery {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'size' | 'type' | 'date' | 'uploader';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  areaId?: string;
  initiativeId?: string;
  uploadedBy?: string;
  accessLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// MAIN LISTING HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user profile - use consistent pattern
    const { user, userProfile } = await authenticateRequest(request)

    // 2. Initialize Supabase client
    const supabase = await createClient();

    // 3. Parse query parameters
    const queryParams = parseQueryParams(request.nextUrl.searchParams);

    // 4. Build and execute query
    const result = await executeFileQuery(supabase, queryParams, userProfile);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: {
        files: result.files,
        pagination: result.pagination,
        filters: result.filters,
        summary: result.summary
      }
    });

  } catch (error) {
    console.error('File listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// QUERY PARAMETER PARSING
// ============================================================================

function parseQueryParams(searchParams: URLSearchParams): FileListQuery {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100 items per page
    sortBy: (searchParams.get('sortBy') as any) || 'date',
    sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') || undefined,
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    areaId: searchParams.get('areaId') || undefined,
    initiativeId: searchParams.get('initiativeId') || undefined,
    uploadedBy: searchParams.get('uploadedBy') || undefined,
    accessLevel: searchParams.get('accessLevel') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined
  };
}

// ============================================================================
// MAIN QUERY EXECUTION
// ============================================================================

async function executeFileQuery(
  supabase: any,
  queryParams: FileListQuery,
  userProfile: any
): Promise<{
  success: boolean;
  error?: string;
  files?: any[];
  pagination?: any;
  filters?: any;
  summary?: any;
}> {
  try {
    // 1. Build base query with permissions
    let query = supabase
      .from('uploaded_files')
      .select(`
        id,
        original_filename,
        file_size,
        mime_type,
        file_type,
        file_category,
        upload_status,
        processing_status,
        access_level,
        created_at,
        updated_at,
        accessed_at,
        uploaded_by,
        area_id,
        initiative_id,
        metadata,
        uploader:uploaded_by(full_name, email),
        area:area_id(name),
        initiative:initiative_id(title)
      `)
      
      .neq('upload_status', 'deleted'); // Exclude deleted files

    // 2. Apply role-based access control
    query = applyAccessControl(query, userProfile);

    // 3. Apply filters
    query = applyFilters(query, queryParams);

    // 4. Apply search
    if (queryParams.search) {
      query = query.or(`
        original_filename.ilike.%${queryParams.search}%,
        uploader.full_name.ilike.%${queryParams.search}%,
        area.name.ilike.%${queryParams.search}%,
        initiative.title.ilike.%${queryParams.search}%
      `);
    }

    // 5. Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('uploaded_files')
      .select('*', { count: 'exact', head: true })
      
      .neq('upload_status', 'deleted');

    if (countError) {
      return { success: false, error: 'Failed to get file count' };
    }

    // 6. Apply sorting
    const sortColumn = getSortColumn(queryParams.sortBy!);
    query = query.order(sortColumn, { ascending: queryParams.sortOrder === 'asc' });

    // 7. Apply pagination
    const offset = (queryParams.page! - 1) * queryParams.limit!;
    query = query.range(offset, offset + queryParams.limit! - 1);

    // 8. Execute query
    const { data: files, error: filesError } = await query;

    if (filesError) {
      console.error('Files query error:', filesError);
      return { success: false, error: 'Failed to fetch files' };
    }

    // 9. Transform file data
    const transformedFiles = files?.map(transformFileData) || [];

    // 10. Get filter options
    const filterOptions = await getFilterOptions(supabase, userProfile);

    // 11. Calculate summary statistics
    const summary = calculateSummary(transformedFiles, totalCount!);

    // 12. Build pagination info
    const pagination = {
      page: queryParams.page!,
      limit: queryParams.limit!,
      total: totalCount!,
      totalPages: Math.ceil(totalCount! / queryParams.limit!),
      hasNext: queryParams.page! * queryParams.limit! < totalCount!,
      hasPrev: queryParams.page! > 1
    };

    return {
      success: true,
      files: transformedFiles,
      pagination,
      filters: filterOptions,
      summary
    };

  } catch (error) {
    console.error('Query execution error:', error);
    return { success: false, error: 'Query execution failed' };
  }
}

// ============================================================================
// ACCESS CONTROL HELPER
// ============================================================================

function applyAccessControl(query: any, userProfile: any) {
  // System admin sees all files
  if (userProfile.is_system_admin) {
    return query;
  }

  // CEO and Admin see all tenant files
  if (['CEO', 'Admin'].includes(userProfile.role)) {
    return query;
  }

  // For other roles, apply access restrictions
  return query.or(`
    uploaded_by.eq.${userProfile.id},
    access_level.eq.tenant,
    and(access_level.eq.area,area_id.eq.${userProfile.area_id || 'null'})
  `);
}

// ============================================================================
// FILTERS HELPER
// ============================================================================

function applyFilters(query: any, queryParams: FileListQuery) {
  if (queryParams.category) {
    query = query.eq('file_category', queryParams.category);
  }

  if (queryParams.type) {
    query = query.eq('file_type', queryParams.type);
  }

  if (queryParams.status) {
    query = query.eq('upload_status', queryParams.status);
  }

  if (queryParams.areaId) {
    query = query.eq('area_id', queryParams.areaId);
  }

  if (queryParams.initiativeId) {
    query = query.eq('initiative_id', queryParams.initiativeId);
  }

  if (queryParams.uploadedBy) {
    query = query.eq('uploaded_by', queryParams.uploadedBy);
  }

  if (queryParams.accessLevel) {
    query = query.eq('access_level', queryParams.accessLevel);
  }

  if (queryParams.dateFrom) {
    query = query.gte('created_at', queryParams.dateFrom);
  }

  if (queryParams.dateTo) {
    query = query.lte('created_at', queryParams.dateTo);
  }

  return query;
}

// ============================================================================
// SORTING HELPER
// ============================================================================

function getSortColumn(sortBy: string): string {
  const sortMapping = {
    'name': 'original_filename',
    'size': 'file_size',
    'type': 'file_type',
    'date': 'created_at',
    'uploader': 'uploader.full_name'
  };

  return sortMapping[sortBy as keyof typeof sortMapping] || 'created_at';
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function transformFileData(file: any) {
  return {
    id: file.id,
    original_filename: file.original_filename,
    file_size: file.file_size,
    mime_type: file.mime_type,
    file_type: file.file_type,
    file_category: file.file_category,
    upload_status: file.upload_status,
    processing_status: file.processing_status,
    access_level: file.access_level,
    created_at: file.created_at,
    updated_at: file.updated_at,
    accessed_at: file.accessed_at,
    uploaded_by: file.uploaded_by,
    uploader_name: file.uploader?.full_name || 'Unknown',
    uploader_email: file.uploader?.email,
    area_id: file.area_id,
    area_name: file.area?.name,
    initiative_id: file.initiative_id,
    initiative_title: file.initiative?.title,
    metadata: file.metadata
  };
}

// ============================================================================
// FILTER OPTIONS HELPER
// ============================================================================

async function getFilterOptions(supabase: any, userProfile: any) {
  try {
    // Get available categories
    const { data: categories } = await supabase
      .from('uploaded_files')
      .select('file_category')
      
      .neq('upload_status', 'deleted');

    // Get available types
    const { data: types } = await supabase
      .from('uploaded_files')
      .select('file_type')
      
      .neq('upload_status', 'deleted');

    // Get available statuses
    const { data: statuses } = await supabase
      .from('uploaded_files')
      .select('upload_status')
      
      .neq('upload_status', 'deleted');

    // Get available areas (if user has access)
    const { data: areas } = await supabase
      .from('areas')
      .select('id, name')
      ;

    // Get available uploaders
    const { data: uploaders } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      ;

    return {
      categories: [...new Set(categories?.map(c => c.file_category).filter(Boolean))],
      types: [...new Set(types?.map(t => t.file_type).filter(Boolean))],
      statuses: [...new Set(statuses?.map(s => s.upload_status).filter(Boolean))],
      areas: areas || [],
      uploaders: uploaders || [],
      accessLevels: ['private', 'area', 'tenant', 'public']
    };
  } catch (error) {
    console.error('Failed to get filter options:', error);
    return {
      categories: [],
      types: [],
      statuses: [],
      areas: [],
      uploaders: [],
      accessLevels: []
    };
  }
}

// ============================================================================
// SUMMARY CALCULATION
// ============================================================================

function calculateSummary(files: any[], totalCount: number) {
  const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
  
  const categoryStats = files.reduce((acc, file) => {
    const category = file.file_category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusStats = files.reduce((acc, file) => {
    const status = file.upload_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeStats = files.reduce((acc, file) => {
    const type = file.file_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalFiles: totalCount,
    displayedFiles: files.length,
    totalSize,
    averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
    categoryStats,
    statusStats,
    typeStats
  };
}
