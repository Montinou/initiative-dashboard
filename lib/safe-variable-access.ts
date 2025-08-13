/**
 * Safe Variable Access Utilities
 * Prevents Temporal Dead Zone (TDZ) errors by ensuring safe variable initialization
 */

/**
 * Safe getter that prevents TDZ errors by checking if variable is defined
 */
export function safeGet<T>(getValue: () => T, fallback?: T): T | undefined {
  try {
    return getValue()
  } catch (error: any) {
    if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
      console.warn('TDZ error prevented:', error.message)
      return fallback
    }
    throw error
  }
}

/**
 * Safe class instantiation with retry mechanism
 */
export function safeInstantiate<T>(
  ClassConstructor: new (...args: any[]) => T,
  args: any[] = [],
  retries: number = 3
): T | null {
  for (let i = 0; i < retries; i++) {
    try {
      return new ClassConstructor(...args)
    } catch (error: any) {
      if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
        console.warn(`TDZ error on instantiation attempt ${i + 1}:`, error.message)
        // Wait a bit before retry
        if (i < retries - 1) {
          continue
        }
      }
      if (i === retries - 1) {
        console.error('Failed to instantiate after retries:', error)
        return null
      }
    }
  }
  return null
}

/**
 * Safe property access with TDZ error handling
 */
export function safePropertyAccess<T extends object, K extends keyof T>(
  obj: T | undefined | null,
  property: K,
  fallback?: T[K]
): T[K] | undefined {
  try {
    if (!obj) return fallback
    return obj[property]
  } catch (error: any) {
    if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
      console.warn('TDZ error in property access:', error.message)
      return fallback
    }
    throw error
  }
}

/**
 * Safe function call with TDZ error handling
 */
export function safeCall<T extends (...args: any[]) => any>(
  fn: T | undefined | null,
  args: Parameters<T>,
  fallback?: ReturnType<T>
): ReturnType<T> | undefined {
  try {
    if (!fn || typeof fn !== 'function') return fallback
    return fn(...args)
  } catch (error: any) {
    if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
      console.warn('TDZ error in function call:', error.message)
      return fallback
    }
    throw error
  }
}

/**
 * Initialize variable with retry and fallback
 */
export function safeInitialize<T>(
  initializer: () => T,
  fallback: T,
  maxRetries: number = 3
): T {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return initializer()
    } catch (error: any) {
      if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
        console.warn(`TDZ error on initialization attempt ${i + 1}:`, error.message)
        if (i === maxRetries - 1) {
          console.warn('Using fallback value after max retries')
          return fallback
        }
        // Small delay before retry
        continue
      }
      throw error
    }
  }
  return fallback
}

/**
 * Hook for safe React state initialization
 */
export function useSafeState<T>(
  initialState: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] | null {
  try {
    // Dynamically import React to avoid TDZ issues
    const React = require('react')
    return React.useState(initialState)
  } catch (error: any) {
    if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
      console.warn('TDZ error in useState:', error.message)
      return null
    }
    throw error
  }
}

/**
 * Safe module import with fallback
 */
export async function safeImport<T>(
  moduleImporter: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await moduleImporter()
  } catch (error: any) {
    if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
      console.warn('TDZ error in dynamic import:', error.message)
      return fallback
    }
    throw error
  }
}