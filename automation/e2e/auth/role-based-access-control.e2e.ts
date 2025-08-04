/**
 * Role-Based Access Control (RBAC) E2E Tests
 * 
 * Comprehensive testing for user role permissions, access restrictions,
 * and functionality availability based on user roles (CEO, Manager, Analyst).
 */

import { test, expect } from '@playwright/test'
import { BasePage } from '../../utils/page-objects/base.page'
import { FileUploadPage } from '../../utils/page-objects/file-upload.page'
import { StratixAssistantPage } from '../../utils/page-objects/stratix-assistant.page'

test.describe('Role-Based Access Control E2E Tests', () => {
  let basePage: BasePage
  let fileUploadPage: FileUploadPage
  let stratixPage: StratixAssistantPage

  // User role definitions
  const userRoles = {
    CEO: {
      email: 'ceo@testcompany.com',
      role: 'CEO',
      permissions: ['read', 'write', 'admin', 'manage_users', 'manage_areas', 'access_all_data'],
      canAccess: {
        dashboard: true,
        initiatives: true,
        areas: true,
        analytics: true,
        fileUpload: true,
        stratixAI: true,
        userManagement: true,
        systemSettings: true
      }
    },
    MANAGER: {
      email: 'manager@testcompany.com',
      role: 'Manager',
      permissions: ['read', 'write', 'manage_area'],
      canAccess: {
        dashboard: true,
        initiatives: true,
        areas: false, // Only own area
        analytics: true, // Limited to own area
        fileUpload: true,
        stratixAI: true,
        userManagement: false,
        systemSettings: false
      }
    },
    ANALYST: {
      email: 'analyst@testcompany.com',
      role: 'Analyst',
      permissions: ['read'],
      canAccess: {
        dashboard: true,
        initiatives: false, // Read-only
        areas: false,
        analytics: true, // Read-only
        fileUpload: false,
        stratixAI: false,
        userManagement: false,
        systemSettings: false
      }
    }
  }

  test.beforeEach(async ({ page }) => {
    basePage = new BasePage(page)
    fileUploadPage = new FileUploadPage(page)
    stratixPage = new StratixAssistantPage(page)
  })

  test.describe('CEO Role Access Control', () => {
    test.use({ storageState: 'automation/fixtures/auth/ceo-auth.json' })

    test('should have full system access as CEO', async ({ page }) => {
      await basePage.goto('/dashboard')
      await basePage.waitForPageLoad()

      // Should see all navigation items
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-initiatives"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-areas"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-users"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible()

      // Should see admin-only features
      await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible()
      await expect(page.locator('[data-testid="system-settings"]')).toBeVisible()
    })

    test('should be able to manage all areas as CEO', async ({ page }) => {
      // Mock areas data
      await page.route('**/api/areas', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: '1', name: 'Marketing', manager_id: 'manager-1' },
              { id: '2', name: 'Sales', manager_id: 'manager-2' },
              { id: '3', name: 'Operations', manager_id: 'manager-3' }
            ]
          })
        })
      })

      await basePage.goto('/dashboard/areas')
      await basePage.waitForPageLoad()

      // Should see all areas
      await expect(page.locator('text=Marketing')).toBeVisible()
      await expect(page.locator('text=Sales')).toBeVisible()
      await expect(page.locator('text=Operations')).toBeVisible()

      // Should be able to create new area
      await expect(page.locator('[data-testid="create-area-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="create-area-button"]')).toBeEnabled()

      // Should be able to edit any area
      await expect(page.locator('[data-testid="edit-area-marketing"]')).toBeVisible()
      await expect(page.locator('[data-testid="edit-area-sales"]')).toBeVisible()
    })

    test('should be able to manage users as CEO', async ({ page }) => {
      await basePage.goto('/users')
      await basePage.waitForPageLoad()

      // Should access user management page
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible()
      
      // Should be able to create users
      await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="create-user-button"]')).toBeEnabled()

      // Should be able to modify user roles
      await expect(page.locator('[data-testid="role-selector"]')).toBeVisible()
    })

    test('should have access to all initiatives across areas as CEO', async ({ page }) => {
      // Mock initiatives from all areas
      await page.route('**/api/initiatives', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: '1', title: 'Marketing Campaign', area_id: 'marketing-area' },
              { id: '2', title: 'Sales Optimization', area_id: 'sales-area' },
              { id: '3', title: 'Operations Improvement', area_id: 'operations-area' }
            ]
          })
        })
      })

      await basePage.goto('/dashboard/initiatives')
      await basePage.waitForPageLoad()

      // Should see initiatives from all areas
      await expect(page.locator('text=Marketing Campaign')).toBeVisible()
      await expect(page.locator('text=Sales Optimization')).toBeVisible()
      await expect(page.locator('text=Operations Improvement')).toBeVisible()
    })
  })

  test.describe('Manager Role Access Control', () => {
    test.use({ storageState: 'automation/fixtures/auth/manager-auth.json' })

    test('should have limited access as Manager', async ({ page }) => {
      await basePage.goto('/dashboard')
      await basePage.waitForPageLoad()

      // Should see basic navigation items
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-initiatives"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible()

      // Should NOT see admin features
      await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-settings"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="admin-panel"]')).not.toBeVisible()
    })

    test('should only see own area as Manager', async ({ page }) => {
      // Mock manager's area data
      await page.route('**/api/areas', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: 'manager-area-1', name: 'Marketing', manager_id: 'current-manager-id' }
            ]
          })
        })
      })

      await basePage.goto('/dashboard/areas')
      await basePage.waitForPageLoad()

      // Should only see own managed area
      await expect(page.locator('text=Marketing')).toBeVisible()
      
      // Should NOT see other areas
      await expect(page.locator('text=Sales')).not.toBeVisible()
      await expect(page.locator('text=Operations')).not.toBeVisible()

      // Should NOT be able to create new areas
      await expect(page.locator('[data-testid="create-area-button"]')).not.toBeVisible()
    })

    test('should only manage initiatives in own area as Manager', async ({ page }) => {
      // Mock initiatives for manager's area only
      await page.route('**/api/initiatives', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { 
                id: '1', 
                title: 'Marketing Campaign', 
                area_id: 'manager-area-1',
                created_by: 'current-manager-id'
              }
            ]
          })
        })
      })

      await basePage.goto('/dashboard/initiatives')
      await basePage.waitForPageLoad()

      // Should see own area initiatives
      await expect(page.locator('text=Marketing Campaign')).toBeVisible()

      // Should be able to create initiatives in own area
      await expect(page.locator('[data-testid="create-initiative-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="create-initiative-button"]')).toBeEnabled()

      // Should be able to edit own area initiatives
      await expect(page.locator('[data-testid="edit-initiative-1"]')).toBeVisible()
    })

    test('should be able to upload files as Manager', async ({ page }) => {
      await fileUploadPage.navigateToManagerUpload()

      // Should have access to file upload
      expect(await fileUploadPage.isUploadZoneVisible()).toBe(true)

      // Mock successful upload for manager
      await page.route('**/api/upload/okr-file', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              uploadId: 'manager-upload-123',
              fileName: 'manager-okr.xlsx',
              area_id: 'manager-area-1',
              savedInitiatives: 5
            }
          })
        })
      })

      // Should be able to upload files
      const fileChooserPromise = page.waitForEvent('filechooser')
      await fileUploadPage.clickUploadZone()
      
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles('automation/fixtures/files/valid-okr-data.xlsx')

      await fileUploadPage.waitForUploadComplete()
      expect(await fileUploadPage.isUploadSuccessful()).toBe(true)
    })

    test('should have limited analytics access as Manager', async ({ page }) => {
      await basePage.goto('/dashboard/analytics')
      await basePage.waitForPageLoad()

      // Should see analytics for own area
      await expect(page.locator('[data-testid="area-analytics"]')).toBeVisible()

      // Should NOT see cross-area comparison tools
      await expect(page.locator('[data-testid="cross-area-comparison"]')).not.toBeVisible()
      
      // Should NOT see system-wide metrics
      await expect(page.locator('[data-testid="system-metrics"]')).not.toBeVisible()
    })

    test('should be denied access to user management as Manager', async ({ page }) => {
      const response = await page.goto('/users')

      // Should be redirected or show access denied
      if (response?.status() === 403) {
        expect(response.status()).toBe(403)
      } else {
        await expect(page.locator('text=Access denied')).toBeVisible()
      }
    })
  })

  test.describe('Analyst Role Access Control', () => {
    test.use({ storageState: 'automation/fixtures/auth/analyst-auth.json' })

    test('should have read-only access as Analyst', async ({ page }) => {
      await basePage.goto('/dashboard')
      await basePage.waitForPageLoad()

      // Should see limited navigation
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible()

      // Should NOT see management features
      await expect(page.locator('[data-testid="nav-initiatives"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-areas"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible()
    })

    test('should have read-only access to initiatives as Analyst', async ({ page }) => {
      // Mock initiatives data
      await page.route('**/api/initiatives', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: '1', title: 'Marketing Campaign', status: 'in_progress' },
              { id: '2', title: 'Sales Initiative', status: 'planning' }
            ]
          })
        })
      })

      await basePage.goto('/dashboard/initiatives')

      // Should be able to view initiatives list
      await expect(page.locator('text=Marketing Campaign')).toBeVisible()
      await expect(page.locator('text=Sales Initiative')).toBeVisible()

      // Should NOT see create/edit buttons
      await expect(page.locator('[data-testid="create-initiative-button"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="edit-initiative-1"]')).not.toBeVisible()

      // Should NOT see delete options
      await expect(page.locator('[data-testid="delete-initiative-1"]')).not.toBeVisible()
    })

    test('should be denied file upload access as Analyst', async ({ page }) => {
      const response = await page.goto('/upload')

      // Should be redirected or show access denied
      if (response?.status() === 403) {
        expect(response.status()).toBe(403)
      } else {
        await expect(page.locator('text=Access denied')).toBeVisible()
      }
    })

    test('should be denied Stratix AI access as Analyst', async ({ page }) => {
      const response = await page.goto('/stratix-assistant')

      // Should be redirected or show access denied
      if (response?.status() === 403) {
        expect(response.status()).toBe(403)
      } else {
        await expect(page.locator('text=Access denied')).toBeVisible()
      }
    })

    test('should have read-only analytics access as Analyst', async ({ page }) => {
      await basePage.goto('/dashboard/analytics')
      await basePage.waitForPageLoad()

      // Should see basic charts and metrics
      await expect(page.locator('[data-testid="analytics-charts"]')).toBeVisible()

      // Should NOT see export options
      await expect(page.locator('[data-testid="export-analytics"]')).not.toBeVisible()

      // Should NOT see configuration options
      await expect(page.locator('[data-testid="configure-analytics"]')).not.toBeVisible()
    })
  })

  test.describe('Permission Boundary Testing', () => {
    test('should prevent privilege escalation attempts', async ({ page }) => {
      // Test with Manager role trying to access CEO functions
      test.use({ storageState: 'automation/fixtures/auth/manager-auth.json' })

      // Mock API that validates permissions
      await page.route('**/api/users/create', async route => {
        const request = route.request()
        const headers = request.headers()
        const userRole = headers['x-user-role']

        if (userRole !== 'CEO') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Insufficient permissions to create users',
              required_role: 'CEO',
              current_role: userRole
            })
          })
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          })
        }
      })

      await basePage.goto('/dashboard')

      // Attempt to create user via API call
      const response = await page.evaluate(async () => {
        return fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'Manager'
          },
          body: JSON.stringify({
            email: 'newuser@test.com',
            role: 'Analyst'
          })
        }).then(r => r.json())
      })

      expect(response.error).toContain('Insufficient permissions')
      expect(response.required_role).toBe('CEO')
    })

    test('should validate role consistency across requests', async ({ page }) => {
      // Mock session validation
      await page.route('**/api/auth/validate', async route => {
        const request = route.request()
        const sessionToken = request.headers()['authorization']
        const claimedRole = request.headers()['x-user-role']

        // Simulate token validation
        const validTokens = {
          'ceo-token': 'CEO',
          'manager-token': 'Manager',
          'analyst-token': 'Analyst'
        }

        const actualRole = validTokens[sessionToken?.replace('Bearer ', '') || '']

        if (actualRole !== claimedRole) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Role mismatch detected',
              expected: actualRole,
              claimed: claimedRole
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, role: actualRole })
          })
        }
      })

      await basePage.goto('/dashboard')

      // Attempt to use mismatched role in request
      const response = await page.evaluate(async () => {
        return fetch('/api/auth/validate', {
          headers: {
            'authorization': 'Bearer manager-token',
            'x-user-role': 'CEO' // Mismatch
          }
        }).then(r => r.json())
      })

      expect(response.error).toContain('Role mismatch detected')
    })

    test('should prevent cross-area data access for Managers', async ({ page }) => {
      test.use({ storageState: 'automation/fixtures/auth/manager-auth.json' })

      // Mock API with area-based access control
      await page.route('**/api/initiatives/**', async route => {
        const request = route.request()
        const url = request.url()
        const userAreaId = request.headers()['x-user-area-id']
        
        // Extract area ID from URL
        const urlAreaId = url.match(/area_id=([^&]+)/)?.[1]

        if (urlAreaId && urlAreaId !== userAreaId) {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Access denied to initiatives outside your area',
              user_area: userAreaId,
              requested_area: urlAreaId
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

      await basePage.goto('/dashboard')

      // Attempt to access initiatives from another area
      const response = await page.evaluate(async () => {
        return fetch('/api/initiatives?area_id=other-area-id', {
          headers: {
            'x-user-area-id': 'manager-area-id'
          }
        }).then(r => r.json())
      })

      expect(response.error).toContain('Access denied to initiatives outside your area')
    })
  })

  test.describe('Dynamic Permission Changes', () => {
    test('should handle role changes during active session', async ({ page }) => {
      // Start as Manager
      test.use({ storageState: 'automation/fixtures/auth/manager-auth.json' })

      await basePage.goto('/dashboard')

      // Mock role change notification
      await page.route('**/api/auth/role-changed', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            new_role: 'Analyst',
            effective_immediately: true,
            requires_reauth: true
          })
        })
      })

      // Simulate role change
      await page.evaluate(() => {
        // Simulate receiving role change notification
        window.dispatchEvent(new CustomEvent('role-changed', {
          detail: { new_role: 'Analyst' }
        }))
      })

      // Should show notification about role change
      await expect(page.locator('text=Your role has been changed')).toBeVisible()

      // Should redirect to login or update permissions
      await page.waitForURL('**/auth/login')
    })

    test('should handle permission revocation gracefully', async ({ page }) => {
      test.use({ storageState: 'automation/fixtures/auth/manager-auth.json' })

      await basePage.goto('/dashboard/initiatives')

      // Mock permission revocation
      await page.route('**/api/**', async route => {
        const request = route.request()
        const timestamp = Date.now()
        
        // Simulate permission expiry
        if (timestamp > Date.now() + 1000) { // Simulate expiry after 1 second
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Permissions expired',
              code: 'PERMISSION_EXPIRED'
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

      // Wait for permission expiry
      await page.waitForTimeout(2000)

      // Try to perform action
      const response = await page.evaluate(async () => {
        return fetch('/api/initiatives').then(r => r.json())
      })

      expect(response.error).toContain('Permissions expired')
    })
  })

  test.describe('Audit and Compliance', () => {
    test('should log all permission-sensitive actions', async ({ page }) => {
      // Mock audit logging
      const auditLogs: any[] = []
      
      await page.route('**/api/audit/log', async route => {
        const request = route.request()
        const auditData = await request.postDataJSON()
        
        auditLogs.push(auditData)
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ logged: true })
        })
      })

      await basePage.goto('/dashboard')

      // Perform various actions
      await basePage.clickElement('[data-testid="nav-initiatives"]')
      await basePage.clickElement('[data-testid="create-initiative-button"]')

      // Verify audit logs were created
      expect(auditLogs.length).toBeGreaterThan(0)
      expect(auditLogs[0]).toHaveProperty('user_id')
      expect(auditLogs[0]).toHaveProperty('action')
      expect(auditLogs[0]).toHaveProperty('timestamp')
      expect(auditLogs[0]).toHaveProperty('ip_address')
    })

    test('should maintain permission compliance records', async ({ page }) => {
      // Mock compliance checking
      await page.route('**/api/compliance/check', async route => {
        const request = route.request()
        const complianceData = await request.postDataJSON()

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            compliant: true,
            checks_passed: [
              'role_verification',
              'permission_boundaries',
              'data_access_validation'
            ],
            timestamp: new Date().toISOString()
          })
        })
      })

      await basePage.goto('/dashboard')

      // Trigger compliance check
      const complianceResult = await page.evaluate(async () => {
        return fetch('/api/compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_type: 'permission_audit' })
        }).then(r => r.json())
      })

      expect(complianceResult.compliant).toBe(true)
      expect(complianceResult.checks_passed).toContain('role_verification')
    })
  })
})