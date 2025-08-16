'use client'

import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Initialize from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) {
        setIsDarkMode(JSON.parse(saved))
      } else {
        // Default to dark mode for better experience
        setIsDarkMode(true)
        localStorage.setItem('darkMode', 'true')
      }
    }
  }, [])
  
  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    }
  }, [isDarkMode])
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }
  
  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode: setIsDarkMode
  }
}
