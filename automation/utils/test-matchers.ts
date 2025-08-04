/**
 * Custom Test Matchers
 * 
 * Extended matchers for more specific testing scenarios in the Mariana project.
 */

import { expect } from 'vitest'

// Extend Vitest's expect interface
interface CustomMatchers<R = unknown> {
  toBeValidFile(): R
  toHaveValidExcelExtension(): R
  toBeWithinSizeLimit(maxSize: number): R
  toHaveValidUploadResponse(): R
  toBeValidStratixResponse(): R
  toHaveValidTenantIsolation(): R
  toBeValidInitiative(): R
  toHaveValidPermissions(expectedPermissions: string[]): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// File validation matcher
expect.extend({
  toBeValidFile(received: File) {
    const pass = received instanceof File && 
                 received.name && 
                 received.name.trim() !== '' &&
                 received.size > 0

    return {
      pass,
      message: () => pass 
        ? `Expected ${received} not to be a valid file`
        : `Expected ${received} to be a valid file with name and size > 0`
    }
  }
})

// Excel file extension matcher
expect.extend({
  toHaveValidExcelExtension(received: File) {
    const validExtensions = ['.xlsx', '.xls']
    const extension = '.' + received.name.split('.').pop()?.toLowerCase()
    const pass = validExtensions.includes(extension)

    return {
      pass,
      message: () => pass
        ? `Expected ${received.name} not to have a valid Excel extension`
        : `Expected ${received.name} to have a valid Excel extension (.xlsx or .xls), got ${extension}`
    }
  }
})

// File size matcher
expect.extend({
  toBeWithinSizeLimit(received: File, maxSize: number) {
    const pass = received.size <= maxSize

    return {
      pass,
      message: () => pass
        ? `Expected file size ${received.size} to exceed ${maxSize} bytes`
        : `Expected file size ${received.size} to be within ${maxSize} bytes limit`
    }
  }
})

// Upload response validation matcher
expect.extend({
  toHaveValidUploadResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean'
    const hasValidData = received.success ? 
      (received.data && 
       typeof received.data.uploadId === 'string' &&
       typeof received.data.fileName === 'string' &&
       typeof received.data.recordsProcessed === 'number') :
      (typeof received.error === 'string')

    const pass = hasSuccess && hasValidData

    return {
      pass,
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to be a valid upload response`
        : `Expected ${JSON.stringify(received)} to be a valid upload response with success boolean and appropriate data/error`
    }
  }
})

// Stratix AI response validation matcher
expect.extend({
  toBeValidStratixResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean'
    const hasValidData = received.success ?
      (received.data &&
       typeof received.data.response === 'string' &&
       received.data.response.length > 0) :
      (typeof received.error === 'string')

    const pass = hasSuccess && hasValidData

    return {
      pass,
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to be a valid Stratix response`
        : `Expected ${JSON.stringify(received)} to be a valid Stratix response with success boolean and appropriate data/error`
    }
  }
})

// Tenant isolation validation matcher
expect.extend({
  toHaveValidTenantIsolation(received: any) {
    const hasTenantId = typeof received.tenant_id === 'string'
    const isNotEmpty = received.tenant_id && received.tenant_id.trim() !== ''

    const pass = hasTenantId && isNotEmpty

    return {
      pass,
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to have valid tenant isolation`
        : `Expected ${JSON.stringify(received)} to have a valid tenant_id for proper isolation`
    }
  }
})

// Initiative validation matcher
expect.extend({
  toBeValidInitiative(received: any) {
    const requiredFields = ['id', 'title', 'tenant_id', 'area_id', 'status', 'progress']
    const hasAllFields = requiredFields.every(field => received.hasOwnProperty(field))
    
    const hasValidStatus = ['planning', 'in_progress', 'completed', 'on_hold'].includes(received.status)
    const hasValidProgress = typeof received.progress === 'number' && 
                            received.progress >= 0 && 
                            received.progress <= 100

    const pass = hasAllFields && hasValidStatus && hasValidProgress

    return {
      pass,
      message: () => pass
        ? `Expected ${JSON.stringify(received)} not to be a valid initiative`
        : `Expected ${JSON.stringify(received)} to be a valid initiative with required fields, valid status, and progress 0-100`
    }
  }
})

// Permissions validation matcher
expect.extend({
  toHaveValidPermissions(received: string[], expectedPermissions: string[]) {
    const hasAllExpected = expectedPermissions.every(permission => 
      received.includes(permission)
    )

    return {
      pass: hasAllExpected,
      message: () => hasAllExpected
        ? `Expected ${JSON.stringify(received)} not to contain all permissions ${JSON.stringify(expectedPermissions)}`
        : `Expected ${JSON.stringify(received)} to contain all permissions ${JSON.stringify(expectedPermissions)}`
    }
  }
})

// Helper function to create file validation utilities
export const fileValidationUtils = {
  isValidExcelFile: (file: File): boolean => {
    const validExtensions = ['.xlsx', '.xls']
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return validExtensions.includes(extension) && file.size > 0
  },

  isWithinSizeLimit: (file: File, maxSize: number = 10 * 1024 * 1024): boolean => {
    return file.size <= maxSize
  },

  getFileExtension: (filename: string): string => {
    return '.' + filename.split('.').pop()?.toLowerCase()
  }
}

// Helper function to validate API responses
export const responseValidationUtils = {
  isValidUploadResponse: (response: any): boolean => {
    return typeof response.success === 'boolean' &&
           (response.success ? 
             (response.data && typeof response.data.uploadId === 'string') :
             (typeof response.error === 'string'))
  },

  isValidStratixResponse: (response: any): boolean => {
    return typeof response.success === 'boolean' &&
           (response.success ?
             (response.data && typeof response.data.response === 'string') :
             (typeof response.error === 'string'))
  },

  isValidErrorResponse: (response: any, expectedCode?: number): boolean => {
    const hasError = typeof response.error === 'string'
    const hasCorrectCode = expectedCode ? response.code === expectedCode : true
    return !response.success && hasError && hasCorrectCode
  }
}

// Helper function to validate database objects
export const dbValidationUtils = {
  isValidInitiative: (initiative: any): boolean => {
    const requiredFields = ['id', 'title', 'tenant_id', 'area_id', 'status', 'progress']
    const hasAllFields = requiredFields.every(field => initiative.hasOwnProperty(field))
    const hasValidStatus = ['planning', 'in_progress', 'completed', 'on_hold'].includes(initiative.status)
    const hasValidProgress = typeof initiative.progress === 'number' && 
                            initiative.progress >= 0 && 
                            initiative.progress <= 100

    return hasAllFields && hasValidStatus && hasValidProgress
  },

  isValidUser: (user: any): boolean => {
    const requiredFields = ['id', 'email', 'tenant_id', 'role']
    return requiredFields.every(field => user.hasOwnProperty(field)) &&
           typeof user.email === 'string' &&
           user.email.includes('@')
  },

  hasValidTenantIsolation: (object: any): boolean => {
    return typeof object.tenant_id === 'string' && 
           object.tenant_id.trim() !== ''
  }
}

// Helper function to validate permissions
export const permissionValidationUtils = {
  hasPermission: (userPermissions: string[], requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission)
  },

  hasAllPermissions: (userPermissions: string[], requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => userPermissions.includes(permission))
  },

  hasAnyPermission: (userPermissions: string[], requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => userPermissions.includes(permission))
  },

  isValidRolePermissions: (role: string, permissions: string[]): boolean => {
    const rolePermissions = {
      'CEO': ['read', 'write', 'admin', 'manage_users', 'manage_areas'],
      'Manager': ['read', 'write', 'manage_area'],
      'Analyst': ['read']
    }

    const expectedPermissions = rolePermissions[role as keyof typeof rolePermissions] || []
    return expectedPermissions.every(permission => permissions.includes(permission))
  }
}