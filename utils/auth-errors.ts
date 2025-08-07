import { isAuthApiError, AuthApiError } from '@supabase/supabase-js'

/**
 * Authentication error codes from Supabase
 */
export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_GRANT: 'invalid_grant',
  BAD_JWT: 'bad_jwt',
  NOT_ADMIN: 'not_admin',
  NO_AUTHORIZATION: 'no_authorization',
  USER_NOT_FOUND: 'user_not_found',
  SESSION_NOT_FOUND: 'session_not_found',
  
  // Email errors
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  EMAIL_EXISTS: 'email_exists',
  EMAIL_PROVIDER_DISABLED: 'email_provider_disabled',
  EMAIL_CHANGE_NOT_CONFIRMED: 'email_change_needs_confirmation',
  
  // Password errors
  WEAK_PASSWORD: 'weak_password',
  SAME_PASSWORD: 'same_password',
  
  // OAuth errors
  OAUTH_PROVIDER_ERROR: 'oauth_provider_error',
  UNEXPECTED_FAILURE: 'unexpected_failure',
  
  // Rate limiting
  OVER_REQUEST_RATE_LIMIT: 'over_request_rate_limit',
  OVER_EMAIL_SEND_RATE_LIMIT: 'over_email_send_rate_limit',
  OVER_SMS_SEND_RATE_LIMIT: 'over_sms_send_rate_limit',
  
  // Session errors
  SESSION_EXPIRED: 'session_expired',
  REFRESH_TOKEN_NOT_FOUND: 'refresh_token_not_found',
  REFRESH_TOKEN_EXPIRED: 'refresh_token_already_used',
  
  // User state errors
  USER_BANNED: 'user_banned',
  USER_INACTIVE: 'user_not_found', // Supabase returns this for inactive users
  
  // MFA errors
  MFA_REQUIRED: 'mfa_verification_required',
  MFA_INVALID: 'mfa_verification_failed',
  
  // Validation errors
  VALIDATION_FAILED: 'validation_failed',
  BAD_REQUEST: 'bad_request',
} as const

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]

/**
 * Error messages in Spanish for user-friendly display
 */
export const ERROR_MESSAGES_ES: Record<string, string> = {
  // Authentication
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.',
  [AUTH_ERROR_CODES.INVALID_GRANT]: 'El token de autorización es inválido o ha expirado.',
  [AUTH_ERROR_CODES.BAD_JWT]: 'Token de sesión inválido. Por favor, inicia sesión nuevamente.',
  [AUTH_ERROR_CODES.NOT_ADMIN]: 'No tienes permisos de administrador para realizar esta acción.',
  [AUTH_ERROR_CODES.NO_AUTHORIZATION]: 'No tienes autorización para acceder a este recurso.',
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: 'No se encontró una cuenta con este email.',
  [AUTH_ERROR_CODES.SESSION_NOT_FOUND]: 'No se encontró una sesión activa. Por favor, inicia sesión.',
  
  // Email
  [AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED]: 'Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
  [AUTH_ERROR_CODES.EMAIL_EXISTS]: 'Ya existe una cuenta con este email.',
  [AUTH_ERROR_CODES.EMAIL_PROVIDER_DISABLED]: 'El inicio de sesión con email está deshabilitado temporalmente.',
  [AUTH_ERROR_CODES.EMAIL_CHANGE_NOT_CONFIRMED]: 'Por favor, confirma el cambio de email en tu bandeja de entrada.',
  
  // Password
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.',
  [AUTH_ERROR_CODES.SAME_PASSWORD]: 'La nueva contraseña debe ser diferente a la actual.',
  
  // OAuth
  [AUTH_ERROR_CODES.OAUTH_PROVIDER_ERROR]: 'Error al iniciar sesión con el proveedor externo. Por favor, intenta de nuevo.',
  [AUTH_ERROR_CODES.UNEXPECTED_FAILURE]: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
  
  // Rate limiting
  [AUTH_ERROR_CODES.OVER_REQUEST_RATE_LIMIT]: 'Demasiados intentos. Por favor, espera unos minutos antes de intentar de nuevo.',
  [AUTH_ERROR_CODES.OVER_EMAIL_SEND_RATE_LIMIT]: 'Se han enviado demasiados emails. Por favor, espera unos minutos.',
  [AUTH_ERROR_CODES.OVER_SMS_SEND_RATE_LIMIT]: 'Se han enviado demasiados SMS. Por favor, espera unos minutos.',
  
  // Session
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_NOT_FOUND]: 'No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 'El token de renovación ha expirado. Por favor, inicia sesión nuevamente.',
  
  // User state
  [AUTH_ERROR_CODES.USER_BANNED]: 'Tu cuenta ha sido suspendida. Contacta al administrador.',
  
  // MFA
  [AUTH_ERROR_CODES.MFA_REQUIRED]: 'Se requiere verificación de dos factores.',
  [AUTH_ERROR_CODES.MFA_INVALID]: 'Código de verificación incorrecto. Por favor, intenta de nuevo.',
  
  // Validation
  [AUTH_ERROR_CODES.VALIDATION_FAILED]: 'Los datos proporcionados no son válidos.',
  [AUTH_ERROR_CODES.BAD_REQUEST]: 'Solicitud inválida. Por favor, verifica los datos e intenta de nuevo.',
  
  // Generic
  'default': 'Ha ocurrido un error. Por favor, intenta de nuevo.',
  'network': 'Error de conexión. Por favor, verifica tu conexión a internet.',
  'timeout': 'La operación tardó demasiado. Por favor, intenta de nuevo.',
  'unknown': 'Error desconocido. Por favor, intenta de nuevo más tarde.'
}

/**
 * Get user-friendly error message in Spanish
 */
export function getAuthErrorMessage(error: any): string {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES_ES['unknown']
  }
  
  // Check if it's a Supabase auth error
  if (isAuthApiError(error)) {
    const authError = error as AuthApiError
    
    // Try to get message by error code
    if (authError.code && ERROR_MESSAGES_ES[authError.code]) {
      return ERROR_MESSAGES_ES[authError.code]
    }
    
    // Check error message for patterns
    const message = authError.message?.toLowerCase() || ''
    
    if (message.includes('invalid') && message.includes('credentials')) {
      return ERROR_MESSAGES_ES[AUTH_ERROR_CODES.INVALID_CREDENTIALS]
    }
    if (message.includes('email') && message.includes('not confirmed')) {
      return ERROR_MESSAGES_ES[AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED]
    }
    if (message.includes('email') && message.includes('already registered')) {
      return ERROR_MESSAGES_ES[AUTH_ERROR_CODES.EMAIL_EXISTS]
    }
    if (message.includes('session') && message.includes('expired')) {
      return ERROR_MESSAGES_ES[AUTH_ERROR_CODES.SESSION_EXPIRED]
    }
    if (message.includes('rate limit')) {
      return ERROR_MESSAGES_ES[AUTH_ERROR_CODES.OVER_REQUEST_RATE_LIMIT]
    }
    
    // Return original message if no mapping found
    return authError.message || ERROR_MESSAGES_ES['default']
  }
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return ERROR_MESSAGES_ES['network']
  }
  
  // Handle timeout errors
  if (error.message?.includes('timeout')) {
    return ERROR_MESSAGES_ES['timeout']
  }
  
  // Return error message if available
  if (error.message) {
    return error.message
  }
  
  // Default message
  return ERROR_MESSAGES_ES['default']
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: any): 'info' | 'warning' | 'error' | 'critical' {
  if (!error) return 'info'
  
  if (isAuthApiError(error)) {
    const code = (error as AuthApiError).code
    
    // Critical errors
    if (code === AUTH_ERROR_CODES.USER_BANNED) return 'critical'
    
    // Errors
    if ([
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      AUTH_ERROR_CODES.SESSION_EXPIRED,
      AUTH_ERROR_CODES.BAD_JWT
    ].includes(code as any)) return 'error'
    
    // Warnings
    if ([
      AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED,
      AUTH_ERROR_CODES.WEAK_PASSWORD,
      AUTH_ERROR_CODES.OVER_REQUEST_RATE_LIMIT
    ].includes(code as any)) return 'warning'
  }
  
  return 'error'
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false
  
  // Network errors are retryable
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return true
  }
  
  // Timeout errors are retryable
  if (error.message?.includes('timeout')) {
    return true
  }
  
  if (isAuthApiError(error)) {
    const code = (error as AuthApiError).code
    
    // These errors are NOT retryable
    const nonRetryableErrors = [
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      AUTH_ERROR_CODES.USER_BANNED,
      AUTH_ERROR_CODES.EMAIL_EXISTS,
      AUTH_ERROR_CODES.WEAK_PASSWORD,
      AUTH_ERROR_CODES.USER_NOT_FOUND
    ]
    
    return !nonRetryableErrors.includes(code as any)
  }
  
  return true // Default to retryable
}

/**
 * Log authentication error with context
 */
export function logAuthError(
  error: any,
  context: {
    action: string
    userId?: string
    email?: string
    metadata?: Record<string, any>
  }
) {
  const severity = getErrorSeverity(error)
  const isRetryable = isRetryableError(error)
  
  const logData = {
    timestamp: new Date().toISOString(),
    severity,
    action: context.action,
    userId: context.userId,
    email: context.email,
    isRetryable,
    error: {
      message: error?.message,
      code: error?.code,
      status: error?.status
    },
    metadata: context.metadata
  }
  
  // Log based on severity
  switch (severity) {
    case 'critical':
      console.error('🚨 CRITICAL AUTH ERROR:', logData)
      break
    case 'error':
      console.error('❌ AUTH ERROR:', logData)
      break
    case 'warning':
      console.warn('⚠️ AUTH WARNING:', logData)
      break
    default:
      console.log('ℹ️ AUTH INFO:', logData)
  }
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production' && severity === 'critical') {
    // Send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  }
}

/**
 * Create a standardized error response
 */
export interface AuthErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  isRetryable: boolean
}

export function createAuthErrorResponse(error: any): AuthErrorResponse {
  const message = getAuthErrorMessage(error)
  const isRetryable = isRetryableError(error)
  
  let code = 'UNKNOWN_ERROR'
  if (isAuthApiError(error)) {
    code = (error as AuthApiError).code || code
  } else if (error?.code) {
    code = error.code
  }
  
  return {
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    },
    isRetryable
  }
}