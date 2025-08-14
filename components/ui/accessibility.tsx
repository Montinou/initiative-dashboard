/**
 * Accessibility Utilities Component
 * 
 * Provides comprehensive accessibility features including:
 * - Skip links for screen reader navigation
 * - Focus management and keyboard navigation
 * - Screen reader announcements
 * - ARIA live regions for dynamic content
 * - Reduced motion preference support
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useEffect, useRef, useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

// ===================================================================================
// ACCESSIBILITY CONTEXT
// ===================================================================================

interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  focusElement: (elementId: string) => void
  prefersReducedMotion: boolean
  highContrast: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

// ===================================================================================
// SKIP LINKS COMPONENT
// ===================================================================================

export function SkipLinks() {
  const skipLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#footer', label: 'Skip to footer' },
  ]

  return (
    <div className="sr-only focus-within:not-sr-only">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="skip-link focus-ring"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

// ===================================================================================
// SCREEN READER ANNOUNCER
// ===================================================================================

interface ScreenReaderAnnouncerProps {
  children?: React.ReactNode
}

export const ScreenReaderAnnouncer = React.forwardRef<
  { announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void },
  ScreenReaderAnnouncerProps
>(({ children }, ref) => {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('')
      setTimeout(() => setAssertiveMessage(message), 100)
    } else {
      setPoliteMessage('')
      setTimeout(() => setPoliteMessage(message), 100)
    }
  }

  React.useImperativeHandle(ref, () => ({
    announceToScreenReader
  }))

  return (
    <>
      {/* Polite announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      
      {/* Assertive announcements for urgent messages */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
      
      {children}
    </>
  )
})

ScreenReaderAnnouncer.displayName = 'ScreenReaderAnnouncer'

// ===================================================================================
// FOCUS MANAGEMENT HOOK
// ===================================================================================

export function useFocusManagement() {
  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const trapFocus = (containerRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault()
              lastElement?.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault()
              firstElement?.focus()
            }
          }
        }
        
        if (e.key === 'Escape') {
          // Allow parent components to handle escape
          container.dispatchEvent(new CustomEvent('escape-key'))
        }
      }

      container.addEventListener('keydown', handleKeyDown)
      return () => container.removeEventListener('keydown', handleKeyDown)
    }, [containerRef])
  }

  return { focusElement, trapFocus }
}

// ===================================================================================
// ACCESSIBILITY PROVIDER
// ===================================================================================

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const announcerRef = useRef<{ announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void }>()

  useEffect(() => {
    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(reducedMotionQuery.matches)
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(highContrastQuery.matches)
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }
    
    highContrastQuery.addEventListener('change', handleHighContrastChange)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      highContrastQuery.removeEventListener('change', handleHighContrastChange)
    }
  }, [])

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    }
  }

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcerRef.current?.announceToScreenReader(message, priority)
  }

  return (
    <AccessibilityContext.Provider value={{
      announceToScreenReader,
      focusElement,
      prefersReducedMotion,
      highContrast
    }}>
      <ScreenReaderAnnouncer ref={announcerRef}>
        {children}
      </ScreenReaderAnnouncer>
    </AccessibilityContext.Provider>
  )
}

// ===================================================================================
// ACCESSIBLE FORM COMPONENTS
// ===================================================================================

interface AccessibleFormFieldProps {
  id: string
  label: string
  children: React.ReactNode
  error?: string[]
  description?: string
  required?: boolean
  className?: string
}

export function AccessibleFormField({
  id,
  label,
  children,
  error,
  description,
  required = false,
  className
}: AccessibleFormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const descriptionId = description ? `${id}-description` : undefined
  
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-foreground flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-destructive" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
          'aria-invalid': error ? 'true' : undefined,
          'aria-required': required,
        })}
      </div>
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-atomic="true"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <span className="sr-only">Error:</span>
          {error[0]}
        </div>
      )}
    </div>
  )
}

// ===================================================================================
// KEYBOARD NAVIGATION HELPERS
// ===================================================================================

export function useKeyboardNavigation() {
  const handleKeyDown = (e: React.KeyboardEvent, handlers: Record<string, () => void>) => {
    const handler = handlers[e.key]
    if (handler) {
      e.preventDefault()
      handler()
    }
  }

  const createKeyboardHandlers = (items: any[], currentIndex: number, onSelect: (index: number) => void, onClose?: () => void) => {
    return {
      'ArrowDown': () => onSelect((currentIndex + 1) % items.length),
      'ArrowUp': () => onSelect(currentIndex === 0 ? items.length - 1 : currentIndex - 1),
      'Home': () => onSelect(0),
      'End': () => onSelect(items.length - 1),
      'Enter': () => items[currentIndex] && items[currentIndex].action?.(),
      'Space': () => items[currentIndex] && items[currentIndex].action?.(),
      'Escape': () => onClose?.(),
    }
  }

  return { handleKeyDown, createKeyboardHandlers }
}

// ===================================================================================
// LOADING ANNOUNCEMENTS
// ===================================================================================

interface LoadingAnnouncerProps {
  isLoading: boolean
  loadingMessage?: string
  successMessage?: string
  errorMessage?: string
}

export function LoadingAnnouncer({
  isLoading,
  loadingMessage = 'Loading content',
  successMessage = 'Content loaded successfully',
  errorMessage = 'Failed to load content'
}: LoadingAnnouncerProps) {
  const { announceToScreenReader } = useAccessibility()
  const [previousLoadingState, setPreviousLoadingState] = useState(isLoading)

  useEffect(() => {
    if (isLoading && !previousLoadingState) {
      announceToScreenReader(loadingMessage, 'polite')
    } else if (!isLoading && previousLoadingState) {
      announceToScreenReader(successMessage, 'polite')
    }
    setPreviousLoadingState(isLoading)
  }, [isLoading, previousLoadingState, loadingMessage, successMessage, announceToScreenReader])

  return null
}

// ===================================================================================
// MOBILE TOUCH ENHANCEMENTS
// ===================================================================================

interface TouchTargetProps {
  children: React.ReactNode
  className?: string
  onTap?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  'aria-label'?: string
}

export function TouchTarget({
  children,
  className,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  'aria-label': ariaLabel,
  ...props
}: TouchTargetProps & React.HTMLAttributes<HTMLDivElement>) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    if (!isVerticalSwipe) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft()
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight()
      }
    }
    
    // If it's a tap (minimal movement)
    if (Math.abs(distanceX) < 10 && Math.abs(distanceY) < 10 && onTap) {
      onTap()
    }
  }

  return (
    <div
      className={cn('touch-target', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </div>
  )
}