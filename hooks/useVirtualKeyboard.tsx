/**
 * Virtual Keyboard Hook
 * 
 * Handles virtual keyboard behavior on mobile devices:
 * - Detects when virtual keyboard is open/closed
 * - Adjusts viewport and scroll behavior
 * - Prevents viewport zoom on input focus
 * - Handles safe area adjustments
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import { useEffect, useState } from 'react'

interface VirtualKeyboardState {
  isOpen: boolean
  height: number
  viewportHeight: number
  originalViewportHeight: number
}

export function useVirtualKeyboard() {
  const [keyboardState, setKeyboardState] = useState<VirtualKeyboardState>({
    isOpen: false,
    height: 0,
    viewportHeight: 0,
    originalViewportHeight: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initialViewportHeight = window.visualViewport?.height || window.innerHeight
    
    setKeyboardState(prev => ({
      ...prev,
      originalViewportHeight: initialViewportHeight,
      viewportHeight: initialViewportHeight
    }))

    const handleViewportChange = () => {
      if (!window.visualViewport) return

      const currentHeight = window.visualViewport.height
      const keyboardHeight = initialViewportHeight - currentHeight
      const isKeyboardOpen = keyboardHeight > 150 // Threshold for keyboard detection

      setKeyboardState(prev => ({
        ...prev,
        isOpen: isKeyboardOpen,
        height: isKeyboardOpen ? keyboardHeight : 0,
        viewportHeight: currentHeight
      }))

      // Adjust body styles when keyboard is open
      if (isKeyboardOpen) {
        document.body.style.height = `${currentHeight}px`
        document.body.style.overflow = 'hidden'
        // Add CSS custom property for use in components
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
        document.documentElement.style.setProperty('--viewport-height', `${currentHeight}px`)
      } else {
        document.body.style.height = ''
        document.body.style.overflow = ''
        document.documentElement.style.removeProperty('--keyboard-height')
        document.documentElement.style.removeProperty('--viewport-height')
      }
    }

    const handleResize = () => {
      // Fallback for devices without visualViewport support
      if (!window.visualViewport) {
        const currentHeight = window.innerHeight
        const keyboardHeight = initialViewportHeight - currentHeight
        const isKeyboardOpen = keyboardHeight > 150

        setKeyboardState(prev => ({
          ...prev,
          isOpen: isKeyboardOpen,
          height: isKeyboardOpen ? keyboardHeight : 0,
          viewportHeight: currentHeight
        }))
      }
    }

    // Add event listeners
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
    } else {
      window.addEventListener('resize', handleResize)
    }

    // Handle input focus to prevent zoom
    const handleInputFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // Scroll the focused element into view with offset for keyboard
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
        }, 300) // Wait for keyboard animation
      }
    }

    const handleInputBlur = () => {
      // Small delay to allow keyboard to close
      setTimeout(() => {
        window.scrollTo(0, 0)
      }, 300)
    }

    document.addEventListener('focusin', handleInputFocus)
    document.addEventListener('focusout', handleInputBlur)

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
      } else {
        window.removeEventListener('resize', handleResize)
      }
      
      document.removeEventListener('focusin', handleInputFocus)
      document.removeEventListener('focusout', handleInputBlur)
      
      // Reset styles
      document.body.style.height = ''
      document.body.style.overflow = ''
      document.documentElement.style.removeProperty('--keyboard-height')
      document.documentElement.style.removeProperty('--viewport-height')
    }
  }, [])

  // Utility functions
  const adjustForKeyboard = (element: HTMLElement) => {
    if (keyboardState.isOpen) {
      const rect = element.getBoundingClientRect()
      const availableSpace = keyboardState.viewportHeight - rect.bottom
      
      if (availableSpace < 20) { // Less than 20px clearance
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }
  }

  const getKeyboardAwareStyles = () => ({
    paddingBottom: keyboardState.isOpen ? `${keyboardState.height}px` : '0px',
    minHeight: keyboardState.isOpen ? `${keyboardState.viewportHeight}px` : 'auto',
    transition: 'padding-bottom 0.2s ease-in-out, min-height 0.2s ease-in-out'
  })

  return {
    ...keyboardState,
    adjustForKeyboard,
    getKeyboardAwareStyles
  }
}

// CSS-in-JS styles for virtual keyboard handling
export const virtualKeyboardStyles = `
  /* Prevent zoom on input focus for iOS */
  @supports (-webkit-overflow-scrolling: touch) {
    input, textarea, select {
      font-size: 16px !important;
    }
  }

  /* Keyboard-aware viewport */
  .keyboard-aware {
    min-height: calc(100vh - var(--keyboard-height, 0px));
    padding-bottom: var(--keyboard-height, 0px);
    transition: min-height 0.2s ease-in-out, padding-bottom 0.2s ease-in-out;
  }

  /* Adjust bottom navigation when keyboard is open */
  .mobile-nav-keyboard-aware {
    bottom: var(--keyboard-height, 0px);
    transition: bottom 0.2s ease-in-out;
  }

  /* Form containers that need keyboard adjustment */
  .form-keyboard-aware {
    padding-bottom: calc(var(--keyboard-height, 0px) + 20px);
    transition: padding-bottom 0.2s ease-in-out;
  }

  /* Prevent body scroll when keyboard is open */
  .keyboard-open {
    height: var(--viewport-height, 100vh);
    overflow: hidden;
  }
`

// Utility component for keyboard-aware containers
export function KeyboardAwareContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const { isOpen, getKeyboardAwareStyles } = useVirtualKeyboard()

  return (
    <div 
      className={`${className} ${isOpen ? 'keyboard-open' : ''}`}
      style={getKeyboardAwareStyles()}
    >
      {children}
    </div>
  )
}