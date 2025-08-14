/**
 * Multi-Factor Authentication Utilities
 * Following Supabase MFA best practices from docs/supabase-sesion.md lines 459-492
 * 
 * This module provides utilities for:
 * - TOTP enrollment and verification
 * - Authentication Assurance Level (AAL) checking
 * - MFA-protected operations
 * - QR code generation for authenticator apps
 */

import { createClient } from '@/utils/supabase/client'

export type MFAFactor = {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendly_name: string
  created_at: string
}

export type MFAChallenge = {
  id: string
  type: 'totp'
  expires_at: number
}

export type AuthAssuranceLevel = 'aal1' | 'aal2'

export interface MFAEnrollmentResult {
  success: boolean
  factor?: MFAFactor
  qr_code?: string
  secret?: string
  error?: Error
}

export interface MFAVerificationResult {
  success: boolean
  factor?: MFAFactor
  error?: Error
}

export interface MFAChallengeResult {
  success: boolean
  challenge?: MFAChallenge
  error?: Error
}

/**
 * Enroll TOTP factor for multi-factor authentication
 * Generates QR code and secret for authenticator app setup
 * 
 * @param friendlyName - Display name for the factor (e.g., "My Phone")
 * @returns MFAEnrollmentResult with QR code and secret
 */
export async function enrollTOTPFactor(friendlyName: string = 'Authenticator App'): Promise<MFAEnrollmentResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName
    })
    
    if (error) {
      console.error('[MFA] Enrollment error:', error)
      return { success: false, error }
    }
    
    return {
      success: true,
      factor: data,
      qr_code: data.totp?.qr_code,
      secret: data.totp?.secret
    }
  } catch (error) {
    console.error('[MFA] Enrollment exception:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Challenge an enrolled MFA factor
 * Must be called before verification
 * 
 * @param factorId - The ID of the factor to challenge
 * @returns MFAChallengeResult with challenge ID
 */
export async function challengeMFAFactor(factorId: string): Promise<MFAChallengeResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId
    })
    
    if (error) {
      console.error('[MFA] Challenge error:', error)
      return { success: false, error }
    }
    
    return {
      success: true,
      challenge: data
    }
  } catch (error) {
    console.error('[MFA] Challenge exception:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Verify MFA factor with TOTP code
 * Completes the MFA enrollment or authentication flow
 * 
 * @param factorId - The ID of the factor
 * @param challengeId - The ID of the challenge
 * @param code - The 6-digit TOTP code from authenticator app
 * @returns MFAVerificationResult
 */
export async function verifyTOTPCode(
  factorId: string, 
  challengeId: string, 
  code: string
): Promise<MFAVerificationResult> {
  try {
    const supabase = createClient()
    
    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return { 
        success: false, 
        error: new Error('Invalid code format. Please enter a 6-digit number.') 
      }
    }
    
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    })
    
    if (error) {
      console.error('[MFA] Verification error:', error)
      return { success: false, error }
    }
    
    return {
      success: true,
      factor: data
    }
  } catch (error) {
    console.error('[MFA] Verification exception:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Get current Authentication Assurance Level
 * AAL1 = basic authentication, AAL2 = MFA completed
 * 
 * @returns Current and next AAL levels
 */
export async function getAuthAssuranceLevel(): Promise<{
  currentLevel: AuthAssuranceLevel | null
  nextLevel: AuthAssuranceLevel | null
  error?: Error
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    if (error) {
      console.error('[MFA] AAL check error:', error)
      return { currentLevel: null, nextLevel: null, error }
    }
    
    return {
      currentLevel: data.currentLevel,
      nextLevel: data.nextLevel
    }
  } catch (error) {
    console.error('[MFA] AAL check exception:', error)
    return { currentLevel: null, nextLevel: null, error: error as Error }
  }
}

/**
 * Check if user needs to complete MFA
 * Returns true if user is at AAL1 but AAL2 is required
 * 
 * @returns boolean indicating if MFA is required
 */
export async function requiresMFA(): Promise<boolean> {
  const { currentLevel, nextLevel } = await getAuthAssuranceLevel()
  return currentLevel === 'aal1' && nextLevel === 'aal2'
}

/**
 * List all enrolled MFA factors for current user
 * 
 * @returns Array of enrolled factors
 */
export async function listMFAFactors(): Promise<{
  factors: MFAFactor[]
  error?: Error
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.mfa.listFactors()
    
    if (error) {
      console.error('[MFA] List factors error:', error)
      return { factors: [], error }
    }
    
    return { factors: data.all }
  } catch (error) {
    console.error('[MFA] List factors exception:', error)
    return { factors: [], error: error as Error }
  }
}

/**
 * Remove/unenroll an MFA factor
 * 
 * @param factorId - The ID of the factor to remove
 * @returns Success/error result
 */
export async function unenrollMFAFactor(factorId: string): Promise<{
  success: boolean
  error?: Error
}> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.mfa.unenroll({
      factorId
    })
    
    if (error) {
      console.error('[MFA] Unenroll error:', error)
      return { success: false, error }
    }
    
    return { success: true }
  } catch (error) {
    console.error('[MFA] Unenroll exception:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Generate backup recovery codes (if supported by provider)
 * TODO: Implement when Supabase adds backup codes support
 */
export async function generateBackupCodes(): Promise<{
  codes: string[]
  error?: Error
}> {
  // TODO: Implement when Supabase supports backup codes
  return {
    codes: [],
    error: new Error('Backup codes not yet supported by Supabase')
  }
}

/**
 * Check if current session has required AAL level
 * Useful for protecting sensitive operations
 * 
 * @param requiredLevel - Required AAL level ('aal1' or 'aal2')
 * @returns boolean indicating if requirement is met
 */
export async function hasRequiredAAL(requiredLevel: AuthAssuranceLevel): Promise<boolean> {
  const { currentLevel } = await getAuthAssuranceLevel()
  
  if (!currentLevel) return false
  
  // AAL2 satisfies both AAL1 and AAL2 requirements
  if (currentLevel === 'aal2') return true
  
  // AAL1 only satisfies AAL1 requirement
  if (currentLevel === 'aal1' && requiredLevel === 'aal1') return true
  
  return false
}

/**
 * MFA-protected operation wrapper
 * Ensures operation only executes with required AAL level
 * 
 * @param operation - The operation to protect
 * @param requiredLevel - Required AAL level (default: 'aal2')
 * @returns Operation result or MFA requirement error
 */
export async function withMFAProtection<T>(
  operation: () => Promise<T>,
  requiredLevel: AuthAssuranceLevel = 'aal2'
): Promise<{ result?: T; error?: Error; requiresMFA?: boolean }> {
  try {
    const hasRequired = await hasRequiredAAL(requiredLevel)
    
    if (!hasRequired) {
      const needsMFA = await requiresMFA()
      return { 
        requiresMFA: needsMFA,
        error: new Error(`Operation requires ${requiredLevel.toUpperCase()} authentication level`)
      }
    }
    
    const result = await operation()
    return { result }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Estimate TOTP code remaining validity time
 * TOTP codes are valid for 30 seconds
 * 
 * @returns Seconds remaining for current TOTP window
 */
export function getTOTPTimeRemaining(): number {
  const now = Date.now() / 1000
  const timeStep = 30
  return timeStep - (now % timeStep)
}

/**
 * Generate user-friendly MFA setup instructions
 * 
 * @param qrCode - QR code URL from enrollment
 * @param secret - Manual entry secret from enrollment
 * @returns Formatted setup instructions
 */
export function generateMFAInstructions(qrCode: string, secret: string): {
  qrInstructions: string
  manualInstructions: string
  supportedApps: string[]
} {
  return {
    qrInstructions: `
1. Open your authenticator app (Google Authenticator, Authy, etc.)
2. Select "Add Account" or "Scan QR Code"
3. Scan the QR code displayed
4. Enter the 6-digit code from your app to complete setup
    `.trim(),
    manualInstructions: `
If you can't scan the QR code, manually enter this secret key in your authenticator app:

${secret}

Account Name: Your Account
Issuer: Initiative Dashboard
    `.trim(),
    supportedApps: [
      'Google Authenticator',
      'Authy',
      'Microsoft Authenticator',
      '1Password',
      'LastPass Authenticator',
      'Duo Mobile'
    ]
  }
}
