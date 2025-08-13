"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FilterErrorBoundary } from "./FilterErrorBoundary"

// XSS prevention helper
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  showClearButton?: boolean
  onSearch?: () => void // Callback when search is triggered
  isSearching?: boolean // External loading state
}

function SearchFilterComponent({ 
  value, 
  onChange, 
  placeholder = "Buscar...",
  debounceMs = 300,
  className,
  showClearButton = true,
  onSearch,
  isSearching = false
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced change handler with input sanitization
  const handleChange = useCallback((newValue: string) => {
    // Limit input length to prevent abuse
    const sanitizedValue = newValue.substring(0, 200)
    setLocalValue(sanitizedValue)
    setIsDebouncing(true)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      onChange(sanitizedValue)
      setIsDebouncing(false)
      if (onSearch) {
        onSearch()
      }
    }, debounceMs)
  }, [onChange, onSearch, debounceMs])

  // Clear search
  const handleClear = useCallback(() => {
    setLocalValue("")
    onChange("")
    setIsDebouncing(false)
    
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Focus input after clearing
    if (inputRef.current) {
      inputRef.current.focus()
    }
    
    if (onSearch) {
      onSearch()
    }
  }, [onChange, onSearch])

  // Handle Enter key to trigger immediate search
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Trigger immediate search
      onChange(localValue)
      setIsDebouncing(false)
      if (onSearch) {
        onSearch()
      }
    }
    
    // Clear on Escape
    if (e.key === 'Escape' && localValue) {
      handleClear()
    }
  }, [localValue, onChange, onSearch, handleClear])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const showLoader = isDebouncing || isSearching

  return (
    <div className={cn("relative group", className)}>
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {showLoader ? (
          <Loader2 className="h-4 w-4 text-white/50 animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-white/50 transition-colors group-focus-within:text-white/70" />
        )}
      </div>

      {/* Input Field */}
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "pl-10 pr-10",
          "bg-white/5 border-white/10",
          "text-white placeholder:text-white/40",
          "focus:bg-white/10 focus:border-purple-400/50",
          "transition-all duration-200",
          "group-focus-within:bg-white/10"
        )}
        aria-label="Search"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Clear Button */}
      {showClearButton && localValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            "h-7 w-7 p-0",
            "text-white/50 hover:text-white/80",
            "hover:bg-white/10",
            "transition-all duration-200"
          )}
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Search Hints */}
      {localValue.length > 0 && localValue.length < 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10">
          <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-lg p-2">
            <p className="text-xs text-white/50">
              Escribe al menos 3 caracteres para buscar
            </p>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      {!localValue && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-xs font-medium text-white/40 bg-white/5 border border-white/10 rounded">
            ⌘K
          </kbd>
        </div>
      )}
    </div>
  )
}

// Wrap with error boundary
export function SearchFilter(props: SearchFilterProps) {
  return (
    <FilterErrorBoundary>
      <SearchFilterComponent {...props} />
    </FilterErrorBoundary>
  )
}

// Advanced Search Filter with Suggestions
interface AdvancedSearchFilterProps extends SearchFilterProps {
  suggestions?: string[]
  recentSearches?: string[]
  onSuggestionClick?: (suggestion: string) => void
  showSuggestions?: boolean
}

export function AdvancedSearchFilter({
  suggestions = [],
  recentSearches = [],
  onSuggestionClick,
  showSuggestions = true,
  ...props
}: AdvancedSearchFilterProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(props.value.toLowerCase())
  ).slice(0, 5)
  
  const showDropdown = isFocused && showSuggestions && 
    (filteredSuggestions.length > 0 || (recentSearches.length > 0 && !props.value))

  const handleSuggestionClick = (suggestion: string) => {
    props.onChange(suggestion)
    setIsFocused(false)
    if (onSuggestionClick) {
      onSuggestionClick(suggestion)
    }
    if (props.onSearch) {
      props.onSearch()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    const totalItems = props.value ? filteredSuggestions.length : recentSearches.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          const items = props.value ? filteredSuggestions : recentSearches
          handleSuggestionClick(items[highlightedIndex])
        }
        break
      case 'Escape':
        setIsFocused(false)
        setHighlightedIndex(-1)
        break
    }
  }

  return (
    <div className="relative">
      <SearchFilter
        {...props}
        className={cn(props.className, "relative z-20")}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        onKeyDown={handleKeyDown}
      />

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="backdrop-blur-xl bg-black/80 border border-white/10 rounded-xl p-2 shadow-2xl">
            {/* Recent Searches */}
            {!props.value && recentSearches.length > 0 && (
              <>
                <div className="text-xs text-white/50 px-2 py-1">Búsquedas recientes</div>
                {recentSearches.map((search, index) => (
                  <button
                    key={search}
                    onClick={() => handleSuggestionClick(search)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm text-white/80",
                      "hover:bg-white/10 transition-colors",
                      highlightedIndex === index && "bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-white/40" />
                      <span>{escapeHtml(search)}</span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Suggestions */}
            {props.value && filteredSuggestions.length > 0 && (
              <>
                <div className="text-xs text-white/50 px-2 py-1">Sugerencias</div>
                {filteredSuggestions.map((suggestion, index) => {
                  const matchIndex = suggestion.toLowerCase().indexOf(props.value.toLowerCase())
                  const beforeMatch = suggestion.slice(0, matchIndex)
                  const match = suggestion.slice(matchIndex, matchIndex + props.value.length)
                  const afterMatch = suggestion.slice(matchIndex + props.value.length)

                  return (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm",
                        "hover:bg-white/10 transition-colors",
                        highlightedIndex === index && "bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-white/40" />
                        <span className="text-white/80">
                          {escapeHtml(beforeMatch)}
                          <span className="font-semibold text-white">{escapeHtml(match)}</span>
                          {escapeHtml(afterMatch)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* No results */}
            {props.value && filteredSuggestions.length === 0 && (
              <div className="text-xs text-white/50 px-3 py-2">
                No se encontraron sugerencias
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}