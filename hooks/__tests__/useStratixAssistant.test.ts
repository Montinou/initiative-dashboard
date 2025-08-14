import { describe, it, expect } from 'vitest'
import { useStratixAssistant } from '../useStratixAssistant'

// Note: useStratixAssistant is deprecated and replaced with DialogflowChatWidget

describe('useStratixAssistant - Deprecated Hook', () => {
  it('should throw deprecation error when called', () => {
    expect(() => {
      useStratixAssistant()
    }).toThrow('useStratixAssistant is deprecated. Use DialogflowChatWidget instead.')
  })
  
  it('should be properly deprecated', () => {
    // This test verifies that the hook is properly deprecated
    // and users are directed to use DialogflowChatWidget instead
    const errorMessage = 'useStratixAssistant is deprecated. Use DialogflowChatWidget instead.'
    
    expect(() => {
      useStratixAssistant()
    }).toThrow(errorMessage)
  })
  
  it('should provide clear migration path', () => {
    // Test that the error message provides clear guidance
    let caughtError: Error | null = null
    
    try {
      useStratixAssistant()
    } catch (error) {
      caughtError = error as Error
    }
    
    expect(caughtError).not.toBeNull()
    expect(caughtError?.message).toContain('DialogflowChatWidget')
    expect(caughtError?.message).toContain('deprecated')
  })
})