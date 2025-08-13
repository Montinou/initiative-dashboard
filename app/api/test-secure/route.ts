/**
 * Test Secure Endpoint
 * 
 * Demonstrates production-hardened API endpoint with:
 * - Rate limiting
 * - Request validation
 * - Error handling
 * - XSS prevention
 * - Authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api-middleware'
import { z } from 'zod'
import { 
  uuidSchema, 
  searchStringSchema, 
  createEnumSchema,
  sanitizeHtml 
} from '@/lib/validation/api-validators'

// Define validation schemas
const querySchema = z.object({
  search: searchStringSchema,
  area_id: uuidSchema.optional(),
  status: createEnumSchema(['active', 'inactive', 'pending'] as const).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

const bodySchema = z.object({
  title: z.string().min(1).max(255).transform(sanitizeHtml),
  description: z.string().max(1000).transform(sanitizeHtml).optional(),
  priority: createEnumSchema(['high', 'medium', 'low'] as const),
  tags: z.array(z.string().max(50).transform(sanitizeHtml)).max(10).optional()
})

/**
 * GET /api/test-secure
 * Demonstrates secure query handling
 */
export const GET = withApiMiddleware(
  async (req: NextRequest, context: any) => {
    // Validated query parameters are available in context
    const { query, userProfile } = context
    
    // Simulate data fetching with sanitized inputs
    const results = {
      message: 'Secure endpoint accessed successfully',
      user: {
        id: userProfile?.id,
        role: userProfile?.role,
        tenant_id: userProfile?.tenant_id
      },
      filters: {
        search: query.search || 'none',
        area_id: query.area_id || 'none',
        status: query.status || 'all',
        pagination: {
          page: query.page,
          limit: query.limit
        }
      },
      security_features: [
        'Rate limiting active (30 req/min)',
        'Input validation enabled',
        'XSS prevention active',
        'SQL injection protection',
        'Authentication required',
        'Security headers applied'
      ]
    }
    
    return NextResponse.json(results)
  },
  {
    rateLimit: 'standard', // 30 requests per minute
    requireAuth: true,
    querySchema
  }
)

/**
 * POST /api/test-secure
 * Demonstrates secure body handling
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, context: any) => {
    // Validated and sanitized body is available in context
    const { body, userProfile } = context
    
    // Check additional permissions
    if (userProfile.role === 'Manager' && body.priority === 'high') {
      return NextResponse.json(
        { 
          error: 'Managers cannot create high priority items',
          details: 'Only CEO and Admin roles can set high priority'
        },
        { status: 403 }
      )
    }
    
    // Simulate creating a resource with sanitized data
    const created = {
      id: crypto.randomUUID(),
      ...body,
      created_by: userProfile.id,
      tenant_id: userProfile.tenant_id,
      created_at: new Date().toISOString(),
      
      // Show that inputs were sanitized
      sanitization_applied: {
        title_safe: body.title !== req.body?.title,
        description_safe: body.description !== req.body?.description,
        tags_safe: body.tags?.some((tag: string, i: number) => tag !== req.body?.tags?.[i])
      }
    }
    
    return NextResponse.json(
      { 
        message: 'Resource created successfully',
        data: created
      },
      { status: 201 }
    )
  },
  {
    rateLimit: 'strict', // 10 requests per minute for creation
    requireAuth: true,
    bodySchema,
    allowedRoles: ['CEO', 'Admin', 'Manager']
  }
)

/**
 * DELETE /api/test-secure
 * Demonstrates role-based access control
 */
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: any) => {
    const { userProfile } = context
    
    return NextResponse.json({
      message: 'Delete operation successful',
      authorized_as: userProfile.role,
      permissions: 'Only CEO and Admin can delete'
    })
  },
  {
    rateLimit: 'strict',
    requireAuth: true,
    allowedRoles: ['CEO', 'Admin'] // Only these roles can delete
  }
)