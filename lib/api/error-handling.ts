/**
 * API Error Handling Utilities
 * Comprehensive error handling wrapper for all API calls with retry logic
 */

export interface APIError extends Error {
  status?: number
  code?: string
  details?: any
  retryable?: boolean
  originalError?: Error
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: APIError) => boolean
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  recoveryTimeout: number
  monitoringWindow: number
}

export interface RequestConfig {
  timeout?: number
  retries?: Partial<RetryOptions>
  circuitBreaker?: boolean
  tenantId?: string
  skipErrorNotification?: boolean
}

export class APIErrorHandler {
  private static circuitBreakers = new Map<string, CircuitBreakerState>()
  private static defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => error.retryable !== false && (!error.status || error.status >= 500)
  }

  private static defaultCircuitBreakerOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringWindow: 60000
  }

  /**
   * Main error handling wrapper for API calls
   */
  static async handleRequest<T>(
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const retryOptions = { ...this.defaultRetryOptions, ...config.retries }
    const circuitBreakerKey = this.getCircuitBreakerKey(requestFn.toString(), config.tenantId)

    // Check circuit breaker
    if (config.circuitBreaker && this.isCircuitOpen(circuitBreakerKey)) {
      throw this.createAPIError(
        'Circuit breaker is open',
        503,
        'CIRCUIT_BREAKER_OPEN',
        false
      )
    }

    let lastError: APIError | null = null

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const result = config.timeout
          ? await this.withTimeout(requestFn(), config.timeout)
          : await requestFn()

        // Reset circuit breaker on success
        if (config.circuitBreaker) {
          this.recordSuccess(circuitBreakerKey)
        }

        return result
      } catch (error) {
        const apiError = this.normalizeError(error)
        lastError = apiError

        // Record failure for circuit breaker
        if (config.circuitBreaker) {
          this.recordFailure(circuitBreakerKey)
        }

        // Don't retry if not retryable or max retries reached
        if (!retryOptions.retryCondition!(apiError) || attempt === retryOptions.maxRetries) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.baseDelay * Math.pow(retryOptions.backoffFactor, attempt),
          retryOptions.maxDelay
        )

        console.warn(`API request failed (attempt ${attempt + 1}/${retryOptions.maxRetries + 1}), retrying in ${delay}ms:`, apiError.message)
        await this.sleep(delay)
      }
    }

    // Log error and optionally show notification
    this.logError(lastError!, config)
    
    if (!config.skipErrorNotification) {
      this.showErrorNotification(lastError!)
    }

    throw lastError
  }

  /**
   * Fetch wrapper with error handling
   */
  static async fetch<T>(
    url: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const { timeout, retries, circuitBreaker, tenantId, skipErrorNotification, ...fetchOptions } = options

    return this.handleRequest(async () => {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        }
      })

      if (!response.ok) {
        const errorData = await this.safeJsonParse(response)
        throw this.createAPIError(
          errorData?.error || response.statusText,
          response.status,
          errorData?.code,
          this.isRetryableStatus(response.status),
          errorData
        )
      }

      return this.safeJsonParse(response)
    }, { timeout, retries, circuitBreaker, tenantId, skipErrorNotification })
  }

  /**
   * Supabase client wrapper with error handling
   */
  static async supabaseRequest<T>(
    requestFn: () => Promise<{ data: T | null; error: any }>,
    config: RequestConfig = {}
  ): Promise<T> {
    return this.handleRequest(async () => {
      const { data, error } = await requestFn()

      if (error) {
        throw this.createAPIError(
          error.message || 'Database operation failed',
          error.status || 500,
          error.code,
          this.isRetryableSupabaseError(error),
          error
        )
      }

      if (data === null) {
        throw this.createAPIError(
          'No data returned',
          404,
          'NO_DATA',
          false
        )
      }

      return data
    }, config)
  }

  /**
   * Create standardized API error
   */
  static createAPIError(
    message: string,
    status?: number,
    code?: string,
    retryable: boolean = false,
    details?: any,
    originalError?: Error
  ): APIError {
    const error = new Error(message) as APIError
    error.status = status
    error.code = code
    error.retryable = retryable
    error.details = details
    error.originalError = originalError
    error.name = 'APIError'
    return error
  }

  /**
   * Normalize various error types to APIError
   */
  static normalizeError(error: any): APIError {
    if (error instanceof Error && 'status' in error) {
      return error as APIError
    }

    if (error?.name === 'AbortError') {
      return this.createAPIError(
        'Request timeout',
        408,
        'TIMEOUT',
        true,
        undefined,
        error
      )
    }

    if (error?.name === 'TypeError' && error.message.includes('fetch')) {
      return this.createAPIError(
        'Network error',
        0,
        'NETWORK_ERROR',
        true,
        undefined,
        error
      )
    }

    if (typeof error === 'string') {
      return this.createAPIError(error, undefined, undefined, false)
    }

    return this.createAPIError(
      error?.message || 'Unknown error',
      error?.status,
      error?.code,
      false,
      error,
      error
    )
  }

  /**
   * Timeout wrapper for promises
   */
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'))
        }, timeoutMs)
      })
    ])
  }

  /**
   * Batch request handler with error isolation
   */
  static async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    config: RequestConfig & { 
      concurrency?: number
      failFast?: boolean
    } = {}
  ): Promise<Array<{ success: true; data: T } | { success: false; error: APIError }>> {
    const { concurrency = 5, failFast = false, ...requestConfig } = config
    const results: Array<{ success: true; data: T } | { success: false; error: APIError }> = []

    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (requestFn) => {
        try {
          const data = await this.handleRequest(requestFn, requestConfig)
          return { success: true as const, data }
        } catch (error) {
          const apiError = this.normalizeError(error)
          if (failFast) {
            throw apiError
          }
          return { success: false as const, error: apiError }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Request deduplication to prevent duplicate API calls
   */
  private static pendingRequests = new Map<string, Promise<any>>()

  static async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    if (this.pendingRequests.has(key)) {
      console.debug(`Deduplicating request: ${key}`)
      return this.pendingRequests.get(key)!
    }

    const promise = this.handleRequest(requestFn, config)
      .finally(() => {
        this.pendingRequests.delete(key)
      })

    this.pendingRequests.set(key, promise)
    return promise
  }

  // Private helper methods
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static async safeJsonParse(response: Response): Promise<any> {
    try {
      const text = await response.text()
      return text ? JSON.parse(text) : null
    } catch {
      return null
    }
  }

  private static isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 408 || status === 429
  }

  private static isRetryableSupabaseError(error: any): boolean {
    const retryableCodes = [
      'PGRST301', // Connection timeout
      'PGRST302', // Connection lost
      '08000',    // Connection exception
      '08003',    // Connection does not exist
      '08006',    // Connection failure
      '53300',    // Too many connections
      '57P01',    // Admin shutdown
    ]
    
    return retryableCodes.includes(error.code) || 
           (error.message && error.message.includes('timeout')) ||
           (error.message && error.message.includes('connection'))
  }

  private static getCircuitBreakerKey(fnString: string, tenantId?: string): string {
    const hash = this.simpleHash(fnString)
    return tenantId ? `${tenantId}_${hash}` : hash
  }

  private static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  private static isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key)
    if (!state) return false

    if (state.state === 'open') {
      if (Date.now() - state.lastFailureTime > this.defaultCircuitBreakerOptions.recoveryTimeout) {
        state.state = 'half-open'
        return false
      }
      return true
    }

    return false
  }

  private static recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key)
    if (state) {
      state.failures = 0
      state.state = 'closed'
    }
  }

  private static recordFailure(key: string): void {
    let state = this.circuitBreakers.get(key)
    if (!state) {
      state = {
        failures: 0,
        lastFailureTime: Date.now(),
        state: 'closed'
      }
      this.circuitBreakers.set(key, state)
    }

    state.failures++
    state.lastFailureTime = Date.now()

    if (state.failures >= this.defaultCircuitBreakerOptions.failureThreshold) {
      state.state = 'open'
      console.warn(`Circuit breaker opened for key: ${key}`)
    }
  }

  private static logError(error: APIError, config: RequestConfig): void {
    const logData = {
      message: error.message,
      status: error.status,
      code: error.code,
      retryable: error.retryable,
      tenantId: config.tenantId,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }

    if (error.status && error.status >= 500) {
      console.error('Server error:', logData)
    } else if (error.status && error.status >= 400) {
      console.warn('Client error:', logData)
    } else {
      console.error('Network/Unknown error:', logData)
    }

    // Could integrate with error tracking service here
    // Sentry.captureException(error, { extra: logData })
  }

  private static showErrorNotification(error: APIError): void {
    // This would integrate with your notification system
    // For now, just console.error
    let message = 'An error occurred'

    if (error.status === 401) {
      message = 'Please log in again'
    } else if (error.status === 403) {
      message = 'You do not have permission to perform this action'
    } else if (error.status === 404) {
      message = 'The requested resource was not found'
    } else if (error.status && error.status >= 500) {
      message = 'Server error. Please try again later'
    } else if (error.code === 'NETWORK_ERROR') {
      message = 'Network error. Please check your connection'
    } else if (error.code === 'TIMEOUT') {
      message = 'Request timed out. Please try again'
    } else if (error.message) {
      message = error.message
    }

    console.error('User notification:', message)
    // toast.error(message)
  }
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'closed' | 'open' | 'half-open'
}

export default APIErrorHandler