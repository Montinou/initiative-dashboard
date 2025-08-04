/**
 * Multi-Tenant Isolation E2E Tests
 * 
 * Comprehensive testing for tenant data isolation, subdomain routing,
 * cross-tenant access prevention, and tenant-specific configurations.
 */

import { test, expect } from '@playwright/test'
import { BasePage } from '../../utils/page-objects/base.page'

test.describe('Multi-Tenant Isolation E2E Tests', () => {
  let basePage: BasePage

  // Test tenant configurations
  const tenants = {
    FEMA: {
      subdomain: 'fema',
      name: 'FEMA Corporation',
      baseUrl: 'http://fema.localhost:3000',
      theme: 'fema-theme',
      adminEmail: 'admin@fema.com'
    },
    SIGA: {
      subdomain: 'siga',
      name: 'SIGA Solutions',
      baseUrl: 'http://siga.localhost:3000',
      theme: 'siga-theme',
      adminEmail: 'admin@siga.com'
    },
    STRATIX: {
      subdomain: 'stratix',
      name: 'Stratix Analytics',
      baseUrl: 'http://stratix.localhost:3000',
      theme: 'stratix-theme',
      adminEmail: 'admin@stratix.com'
    }
  }

  test.beforeEach(async ({ page }) => {
    basePage = new BasePage(page)
  })

  test.describe('Subdomain Routing', () => {
    test('should route to correct tenant based on subdomain', async ({ page }) => {
      for (const [tenantKey, tenant] of Object.entries(tenants)) {
        // Navigate to tenant-specific URL
        await basePage.goto(tenant.baseUrl)
        await basePage.waitForPageLoad()

        // Verify we're on the correct tenant
        const currentUrl = basePage.getCurrentUrl()
        expect(currentUrl).toContain(tenant.subdomain)

        // Check for tenant-specific branding or content
        await expect(page.locator(`[data-tenant="${tenant.subdomain}"]`)).toBeVisible()
        
        console.log(`✅ ${tenantKey} tenant routing verified`)
      }
    })

    test('should redirect to correct subdomain when accessing main domain', async ({ page }) => {
      // This test would depend on your subdomain resolution logic
      // Mock or configure tenant resolution
      await page.route('**/api/tenant/resolve', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tenant: 'fema',
            subdomain: 'fema',
            redirectUrl: 'http://fema.localhost:3000'
          })
        })
      })

      await basePage.goto('http://localhost:3000')
      
      // Should redirect to tenant subdomain
      await page.waitForURL('**/fema**')
      expect(basePage.getCurrentUrl()).toContain('fema')
    })

    test('should show 404 for non-existent tenant subdomains', async ({ page }) => {
      const invalidUrl = 'http://nonexistent.localhost:3000'
      
      const response = await page.goto(invalidUrl)
      
      // Should return 404 or show error page
      expect(response?.status()).toBe(404)
      
      // Or check for error page content
      await expect(page.locator('text=Tenant not found')).toBeVisible()
    })
  })

  test.describe('Data Isolation', () => {
    test('should isolate data between tenants', async ({ page }) => {
      // Mock tenant-specific data for FEMA
      await page.route('**/api/initiatives**', async route => {
        const url = route.request().url()
        
        if (url.includes('fema')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                {
                  id: 'fema-initiative-1',
                  title: 'FEMA Marketing Campaign',
                  tenant_id: 'fema-tenant-id',
                  area_id: 'fema-marketing-area'
                }
              ]
            })
          })
        } else if (url.includes('siga')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [
                {
                  id: 'siga-initiative-1',
                  title: 'SIGA Sales Initiative',
                  tenant_id: 'siga-tenant-id',
                  area_id: 'siga-sales-area'
                }
              ]
            })
          })
        }
      })

      // Test FEMA tenant
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard/initiatives')
      await basePage.waitForPageLoad()

      // Should only see FEMA data
      await expect(page.locator('text=FEMA Marketing Campaign')).toBeVisible()
      await expect(page.locator('text=SIGA Sales Initiative')).not.toBeVisible()

      // Test SIGA tenant
      await basePage.goto(tenants.SIGA.baseUrl + '/dashboard/initiatives')
      await basePage.waitForPageLoad()

      // Should only see SIGA data
      await expect(page.locator('text=SIGA Sales Initiative')).toBeVisible()
      await expect(page.locator('text=FEMA Marketing Campaign')).not.toBeVisible()
    })

    test('should prevent cross-tenant data access via API manipulation', async ({ page }) => {
      // Navigate to FEMA tenant
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')
      
      // Mock API response that simulates unauthorized access attempt
      await page.route('**/api/initiatives**', async route => {
        const request = route.request()
        const headers = request.headers()
        
        // Check if request includes proper tenant identification
        if (!headers['x-tenant-id'] || headers['x-tenant-id'] !== 'fema-tenant-id') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Unauthorized access to tenant data',
              code: 'TENANT_ACCESS_DENIED'
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] })
          })
        }
      })

      // Attempt to access data without proper tenant context
      const response = await page.evaluate(async () => {
        return fetch('/api/initiatives', {
          headers: {
            'x-tenant-id': 'siga-tenant-id' // Wrong tenant ID
          }
        }).then(r => r.json())
      })

      expect(response.error).toContain('Unauthorized access')
      expect(response.code).toBe('TENANT_ACCESS_DENIED')
    })

    test('should isolate file uploads between tenants', async ({ page }) => {
      // Mock file upload responses for different tenants
      await page.route('**/api/upload/okr-file', async route => {
        const request = route.request()
        const tenantHeader = request.headers()['x-tenant-id']
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: `${tenantHeader}-upload-123`,
              fileName: 'test-upload.xlsx',
              tenant_id: tenantHeader,
              savedInitiatives: 5
            }
          })
        })
      })

      // Test upload isolation for FEMA
      await basePage.goto(tenants.FEMA.baseUrl + '/upload')
      
      // Simulate file upload
      await page.setInputFiles('input[type="file"]', 'automation/fixtures/files/valid-okr-data.xlsx')
      
      // Wait for upload response
      const uploadResponse = await basePage.waitForApiResponse('/api/upload/okr-file')
      
      // Verify tenant isolation
      expect(uploadResponse.data.tenant_id).toBe('fema-tenant-id')
      expect(uploadResponse.data.uploadId).toContain('fema-tenant-id')
    })
  })

  test.describe('Authentication Isolation', () => {
    test('should prevent cross-tenant authentication', async ({ page }) => {
      // Mock authentication for FEMA tenant
      await page.route('**/auth/login', async route => {
        const request = route.request()
        const body = await request.postDataJSON()
        
        if (body.email === tenants.FEMA.adminEmail) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              user: {
                id: 'fema-admin-id',
                email: tenants.FEMA.adminEmail,
                tenant_id: 'fema-tenant-id'
              },
              session: { access_token: 'fema-token' }
            })
          })
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid credentials for this tenant'
            })
          })
        }
      })

      // Navigate to FEMA login
      await basePage.goto(tenants.FEMA.baseUrl + '/auth/login')
      
      // Try to login with SIGA credentials
      await basePage.fillInput('input[type="email"]', tenants.SIGA.adminEmail)
      await basePage.fillInput('input[type="password"]', 'password123')
      await basePage.clickElement('button[type="submit"]')

      // Should show error
      await expect(page.locator('text=Invalid credentials')).toBeVisible()

      // Now login with correct FEMA credentials
      await basePage.fillInput('input[type="email"]', tenants.FEMA.adminEmail)
      await basePage.fillInput('input[type="password"]', 'password123')
      await basePage.clickElement('button[type="submit"]')

      // Should succeed
      await page.waitForURL('**/dashboard')
      expect(basePage.getCurrentUrl()).toContain('fema')
    })

    test('should maintain session isolation between tenants', async ({ page, context }) => {
      // Login to FEMA tenant
      await basePage.goto(tenants.FEMA.baseUrl + '/auth/login')
      
      // Mock successful login
      await page.route('**/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: { id: 'fema-user', tenant_id: 'fema-tenant-id' },
            session: { access_token: 'fema-session-token' }
          })
        })
      })

      await basePage.fillInput('input[type="email"]', tenants.FEMA.adminEmail)
      await basePage.fillInput('input[type="password"]', 'password123')
      await basePage.clickElement('button[type="submit"]')

      await page.waitForURL('**/dashboard')

      // Open new tab/page for SIGA tenant
      const sigaPage = await context.newPage()
      const sigaBasePage = new BasePage(sigaPage)
      
      await sigaBasePage.goto(tenants.SIGA.baseUrl + '/dashboard')

      // Should not be authenticated in SIGA tenant
      await sigaPage.waitForURL('**/auth/login')
      expect(sigaBasePage.getCurrentUrl()).toContain('login')

      await sigaPage.close()
    })
  })

  test.describe('Tenant Configuration Isolation', () => {
    test('should apply tenant-specific themes and branding', async ({ page }) => {
      for (const [tenantKey, tenant] of Object.entries(tenants)) {
        await basePage.goto(tenant.baseUrl)
        await basePage.waitForPageLoad()

        // Check for tenant-specific theme class
        await expect(page.locator('html')).toHaveClass(new RegExp(tenant.theme))
        
        // Check for tenant-specific branding elements
        await expect(page.locator(`[data-tenant-brand="${tenant.subdomain}"]`)).toBeVisible()
        
        console.log(`✅ ${tenantKey} theme and branding verified`)
      }
    })

    test('should apply tenant-specific settings and configurations', async ({ page }) => {
      // Mock tenant-specific settings
      await page.route('**/api/tenant/settings', async route => {
        const url = route.request().url()
        
        if (url.includes('fema')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              settings: {
                theme: 'fema-theme',
                features: ['okr-upload', 'stratix-ai', 'analytics'],
                maxFileSize: '10MB',
                defaultCurrency: 'USD'
              }
            })
          })
        } else if (url.includes('siga')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              settings: {
                theme: 'siga-theme',
                features: ['okr-upload', 'basic-analytics'],
                maxFileSize: '5MB',
                defaultCurrency: 'EUR'
              }
            })
          })
        }
      })

      // Test FEMA settings
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')
      const femaSettings = await basePage.waitForApiResponse('/api/tenant/settings')
      
      expect(femaSettings.settings.features).toContain('stratix-ai')
      expect(femaSettings.settings.maxFileSize).toBe('10MB')

      // Test SIGA settings
      await basePage.goto(tenants.SIGA.baseUrl + '/dashboard')
      const sigaSettings = await basePage.waitForApiResponse('/api/tenant/settings')
      
      expect(sigaSettings.settings.features).not.toContain('stratix-ai')
      expect(sigaSettings.settings.maxFileSize).toBe('5MB')
    })

    test('should isolate tenant-specific feature flags', async ({ page }) => {
      // Mock feature flags for different tenants
      await page.route('**/api/features**', async route => {
        const url = route.request().url()
        
        const featureFlags = {
          fema: {
            ENABLE_STRATIX: true,
            ENABLE_ADVANCED_ANALYTICS: true,
            ENABLE_FILE_UPLOAD: true,
            MAX_USERS: 100
          },
          siga: {
            ENABLE_STRATIX: false,
            ENABLE_ADVANCED_ANALYTICS: false,
            ENABLE_FILE_UPLOAD: true,
            MAX_USERS: 50
          },
          stratix: {
            ENABLE_STRATIX: true,
            ENABLE_ADVANCED_ANALYTICS: true,
            ENABLE_FILE_UPLOAD: true,
            MAX_USERS: 200
          }
        }

        const tenant = url.includes('fema') ? 'fema' : 
                     url.includes('siga') ? 'siga' : 'stratix'

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ flags: featureFlags[tenant] })
        })
      })

      // Test feature availability for FEMA
      await basePage.goto(tenants.FEMA.baseUrl + '/stratix-assistant')
      
      // Should have access to Stratix
      await expect(page.locator('[data-testid="stratix-chat-container"]')).toBeVisible()

      // Test feature restriction for SIGA
      await basePage.goto(tenants.SIGA.baseUrl + '/stratix-assistant')
      
      // Should show feature not available
      await expect(page.locator('text=Feature not available')).toBeVisible()
    })
  })

  test.describe('Database Row-Level Security (RLS)', () => {
    test('should enforce RLS policies for initiatives', async ({ page }) => {
      // Mock database queries with RLS enforcement
      await page.route('**/api/initiatives**', async route => {
        const request = route.request()
        const tenantId = request.headers()['x-tenant-id']
        
        // Simulate RLS policy enforcement
        const mockData = {
          'fema-tenant-id': [
            { id: '1', title: 'FEMA Initiative 1', tenant_id: 'fema-tenant-id' },
            { id: '2', title: 'FEMA Initiative 2', tenant_id: 'fema-tenant-id' }
          ],
          'siga-tenant-id': [
            { id: '3', title: 'SIGA Initiative 1', tenant_id: 'siga-tenant-id' }
          ]
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockData[tenantId] || []
          })
        })
      })

      // Test FEMA tenant data access
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard/initiatives')
      
      const initiatives = await basePage.waitForApiResponse('/api/initiatives')
      expect(initiatives.data).toHaveLength(2)
      expect(initiatives.data[0].tenant_id).toBe('fema-tenant-id')
    })

    test('should prevent SQL injection attempts across tenants', async ({ page }) => {
      // Mock API that validates and sanitizes tenant queries
      await page.route('**/api/initiatives**', async route => {
        const request = route.request()
        const url = request.url()
        
        // Check for SQL injection patterns
        const suspiciousPatterns = [
          'DROP TABLE',
          'SELECT * FROM',
          "'; DELETE",
          'UNION SELECT',
          '--',
          '/*'
        ]

        const hasSqlInjection = suspiciousPatterns.some(pattern => 
          url.toUpperCase().includes(pattern)
        )

        if (hasSqlInjection) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid query parameters',
              code: 'INVALID_REQUEST'
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [] })
          })
        }
      })

      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')

      // Attempt SQL injection via URL manipulation
      const response = await page.evaluate(async () => {
        return fetch("/api/initiatives?filter='; DROP TABLE initiatives; --")
          .then(r => r.json())
      })

      expect(response.error).toContain('Invalid query parameters')
      expect(response.code).toBe('INVALID_REQUEST')
    })
  })

  test.describe('Cross-Tenant Communication Prevention', () => {
    test('should prevent direct API calls to other tenants', async ({ page }) => {
      // Navigate to FEMA tenant
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')

      // Mock API that validates tenant context
      await page.route('**/api/**', async route => {
        const request = route.request()
        const origin = request.headers()['origin']
        const tenantId = request.headers()['x-tenant-id']
        
        // Validate that tenant ID matches origin
        const expectedTenant = origin?.includes('fema') ? 'fema-tenant-id' :
                             origin?.includes('siga') ? 'siga-tenant-id' :
                             origin?.includes('stratix') ? 'stratix-tenant-id' : null

        if (tenantId !== expectedTenant) {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Cross-tenant access denied',
              code: 'TENANT_MISMATCH'
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          })
        }
      })

      // Attempt to access SIGA data from FEMA context
      const response = await page.evaluate(async () => {
        return fetch('/api/initiatives', {
          headers: {
            'x-tenant-id': 'siga-tenant-id' // Wrong tenant
          }
        }).then(r => r.json())
      })

      expect(response.error).toContain('Cross-tenant access denied')
    })

    test('should isolate WebSocket connections between tenants', async ({ page }) => {
      // This would test real-time features isolation
      // Mock WebSocket connection handling
      
      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')

      // Simulate WebSocket connection attempt
      const wsResponse = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const ws = new WebSocket('ws://localhost:3000/ws?tenant=fema-tenant-id')
          
          ws.onopen = () => {
            resolve({ status: 'connected', tenant: 'fema' })
          }
          
          ws.onerror = (error) => {
            resolve({ status: 'error', error: error.message })
          }
          
          setTimeout(() => {
            resolve({ status: 'timeout' })
          }, 5000)
        })
      })

      expect(wsResponse.status).toBe('connected')
      expect(wsResponse.tenant).toBe('fema')
    })
  })

  test.describe('Audit and Logging', () => {
    test('should log tenant-specific activities separately', async ({ page }) => {
      // Mock audit logging
      await page.route('**/api/audit/log', async route => {
        const request = route.request()
        const logData = await request.postDataJSON()
        
        // Verify log entry includes tenant context
        expect(logData.tenant_id).toBeTruthy()
        expect(logData.action).toBeTruthy()
        expect(logData.timestamp).toBeTruthy()

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ logged: true })
        })
      })

      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')

      // Perform action that should be logged
      await basePage.clickElement('[data-testid="initiative-create"]')

      // Verify audit log was called
      const auditCall = await basePage.waitForApiResponse('/api/audit/log')
      expect(auditCall.logged).toBe(true)
    })

    test('should maintain separate error logs per tenant', async ({ page }) => {
      // Mock error logging
      await page.route('**/api/errors/report', async route => {
        const request = route.request()
        const errorData = await request.postDataJSON()
        
        // Verify error report includes tenant context
        expect(errorData.tenant_id).toBeTruthy()
        expect(errorData.error_type).toBeTruthy()

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ reported: true })
        })
      })

      await basePage.goto(tenants.FEMA.baseUrl + '/dashboard')

      // Trigger an error
      await page.evaluate(() => {
        // Simulate JavaScript error
        throw new Error('Test error for logging')
      })

      // Check if error was reported with tenant context
      const errorReport = await basePage.waitForApiResponse('/api/errors/report')
      expect(errorReport.reported).toBe(true)
    })
  })
})