"use client"

import { EnhancedFilterState as GlobalFilterState } from '../types/filters'

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: Partial<GlobalFilterState>
  isSystem?: boolean
  createdAt: string
  updatedAt: string
  useCount?: number
  lastUsed?: string
  tags?: string[]
}

/**
 * Local storage key for user-defined filter presets
 */
const PRESETS_STORAGE_KEY = 'dashboard-filter-presets'
const PRESET_USAGE_STORAGE_KEY = 'dashboard-filter-preset-usage'

/**
 * Default system presets available to all users
 */
export const SYSTEM_PRESETS: FilterPreset[] = [
  {
    id: 'all-active',
    name: 'All Active',
    description: 'Show all items except completed',
    filters: {
      statuses: ['planning', 'in_progress']
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['status', 'active']
  },
  {
    id: 'high-priority',
    name: 'High Priority',
    description: 'Show only high priority items',
    filters: {
      priorities: ['high']
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['priority']
  },
  {
    id: 'completed-this-quarter',
    name: 'Completed This Quarter',
    description: 'Show items completed in current quarter',
    filters: {
      statuses: ['completed']
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['status', 'quarter', 'completed']
  },
  {
    id: 'low-progress',
    name: 'Low Progress',
    description: 'Show items with progress less than 30%',
    filters: {
      progressMin: 0,
      progressMax: 30,
      statuses: ['planning', 'in_progress']
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['progress', 'attention']
  },
  {
    id: 'nearly-complete',
    name: 'Nearly Complete',
    description: 'Show items with progress 80% or higher',
    filters: {
      progressMin: 80,
      progressMax: 100,
      statuses: ['in_progress']
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['progress', 'completion']
  },
  {
    id: 'this-quarter',
    name: 'Current Year',
    description: 'Show items for current year',
    filters: {
      startDate: new Date().getFullYear() + '-01-01',
      endDate: new Date().getFullYear() + '-12-31'
    },
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['year', 'current']
  }
]

// REMOVED: getCurrentQuarter() - using date ranges instead

/**
 * Filter preset management utility class
 */
export class FilterPresetManager {
  /**
   * Get all available presets (system + user)
   */
  static getAllPresets(): FilterPreset[] {
    const userPresets = this.getUserPresets()
    return [...SYSTEM_PRESETS, ...userPresets]
  }

  /**
   * Get user-defined presets from localStorage
   */
  static getUserPresets(): FilterPreset[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (!stored) return []
      
      const presets = JSON.parse(stored)
      return Array.isArray(presets) ? presets : []
    } catch (error) {
      console.warn('Failed to load filter presets:', error)
      return []
    }
  }

  /**
   * Save user-defined presets to localStorage
   */
  static saveUserPresets(presets: FilterPreset[]): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      // Filter out system presets before saving
      const userPresets = presets.filter(preset => !preset.isSystem)
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userPresets))
      return true
    } catch (error) {
      console.warn('Failed to save filter presets:', error)
      return false
    }
  }

  /**
   * Create a new filter preset
   */
  static createPreset(
    name: string,
    filters: Partial<GlobalFilterState>,
    description?: string,
    tags?: string[]
  ): FilterPreset {
    const preset: FilterPreset = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim(),
      filters,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
      tags: tags || []
    }

    const existingPresets = this.getUserPresets()
    const updatedPresets = [...existingPresets, preset]
    
    if (this.saveUserPresets(updatedPresets)) {
      return preset
    }
    
    throw new Error('Failed to save preset')
  }

  /**
   * Update an existing preset
   */
  static updatePreset(
    id: string,
    updates: Partial<Omit<FilterPreset, 'id' | 'createdAt' | 'isSystem'>>
  ): boolean {
    const presets = this.getUserPresets()
    const index = presets.findIndex(preset => preset.id === id)
    
    if (index === -1) return false
    
    presets[index] = {
      ...presets[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    return this.saveUserPresets(presets)
  }

  /**
   * Delete a preset
   */
  static deletePreset(id: string): boolean {
    const presets = this.getUserPresets()
    const filtered = presets.filter(preset => preset.id !== id)
    
    if (filtered.length === presets.length) return false // Preset not found
    
    return this.saveUserPresets(filtered)
  }

  /**
   * Get preset by ID
   */
  static getPreset(id: string): FilterPreset | null {
    const allPresets = this.getAllPresets()
    return allPresets.find(preset => preset.id === id) || null
  }

  /**
   * Search presets by name or tags
   */
  static searchPresets(query: string): FilterPreset[] {
    const allPresets = this.getAllPresets()
    const searchTerm = query.toLowerCase().trim()
    
    if (!searchTerm) return allPresets
    
    return allPresets.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description?.toLowerCase().includes(searchTerm) ||
      preset.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  /**
   * Get presets by tag
   */
  static getPresetsByTag(tag: string): FilterPreset[] {
    const allPresets = this.getAllPresets()
    return allPresets.filter(preset => 
      preset.tags?.includes(tag.toLowerCase())
    )
  }

  /**
   * Record preset usage
   */
  static recordPresetUsage(id: string): void {
    if (typeof window === 'undefined') return
    
    try {
      // Update usage count and last used time for user presets
      const userPresets = this.getUserPresets()
      const preset = userPresets.find(p => p.id === id)
      
      if (preset) {
        preset.useCount = (preset.useCount || 0) + 1
        preset.lastUsed = new Date().toISOString()
        this.saveUserPresets(userPresets)
      }
      
      // Track usage statistics separately
      const usage = this.getUsageStats()
      usage[id] = {
        count: (usage[id]?.count || 0) + 1,
        lastUsed: new Date().toISOString()
      }
      
      localStorage.setItem(PRESET_USAGE_STORAGE_KEY, JSON.stringify(usage))
    } catch (error) {
      console.warn('Failed to record preset usage:', error)
    }
  }

  /**
   * Get usage statistics for all presets
   */
  static getUsageStats(): Record<string, { count: number; lastUsed: string }> {
    if (typeof window === 'undefined') return {}
    
    try {
      const stored = localStorage.getItem(PRESET_USAGE_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to load usage stats:', error)
      return {}
    }
  }

  /**
   * Get most used presets
   */
  static getMostUsedPresets(limit = 5): FilterPreset[] {
    const usage = this.getUsageStats()
    const allPresets = this.getAllPresets()
    
    // Sort presets by usage count
    const withUsage = allPresets.map(preset => ({
      ...preset,
      usageCount: usage[preset.id]?.count || 0
    }))
    
    return withUsage
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  /**
   * Get recently used presets
   */
  static getRecentlyUsedPresets(limit = 5): FilterPreset[] {
    const usage = this.getUsageStats()
    const allPresets = this.getAllPresets()
    
    // Sort presets by last used date
    const withLastUsed = allPresets
      .map(preset => ({
        ...preset,
        lastUsedDate: usage[preset.id]?.lastUsed ? new Date(usage[preset.id].lastUsed) : new Date(0)
      }))
      .filter(preset => preset.lastUsedDate.getTime() > 0)
    
    return withLastUsed
      .sort((a, b) => b.lastUsedDate.getTime() - a.lastUsedDate.getTime())
      .slice(0, limit)
  }

  /**
   * Export presets to JSON
   */
  static exportPresets(): string {
    const userPresets = this.getUserPresets()
    return JSON.stringify(userPresets, null, 2)
  }

  /**
   * Import presets from JSON
   */
  static importPresets(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const importedPresets = JSON.parse(jsonData)
      
      if (!Array.isArray(importedPresets)) {
        return { success: false, imported: 0, errors: ['Invalid format: expected array of presets'] }
      }
      
      const existingPresets = this.getUserPresets()
      const existingNames = new Set(existingPresets.map(p => p.name))
      const errors: string[] = []
      let imported = 0
      
      const validPresets = importedPresets.filter(preset => {
        // Basic validation
        if (!preset.name || !preset.filters) {
          errors.push(`Invalid preset: missing name or filters`)
          return false
        }
        
        // Check for name conflicts
        if (existingNames.has(preset.name)) {
          errors.push(`Preset "${preset.name}" already exists`)
          return false
        }
        
        return true
      })
      
      // Add imported presets
      const newPresets = validPresets.map(preset => ({
        ...preset,
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        useCount: 0
      }))
      
      const allUserPresets = [...existingPresets, ...newPresets]
      
      if (this.saveUserPresets(allUserPresets)) {
        imported = newPresets.length
        return { success: true, imported, errors }
      } else {
        return { success: false, imported: 0, errors: ['Failed to save imported presets'] }
      }
      
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      }
    }
  }

  /**
   * Validate preset filters
   */
  static validatePreset(preset: Partial<FilterPreset>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!preset.name || preset.name.trim().length === 0) {
      errors.push('Preset name is required')
    }
    
    if (preset.name && preset.name.trim().length > 100) {
      errors.push('Preset name too long (max 100 characters)')
    }
    
    if (!preset.filters || Object.keys(preset.filters).length === 0) {
      errors.push('At least one filter must be specified')
    }
    
    if (preset.description && preset.description.length > 500) {
      errors.push('Description too long (max 500 characters)')
    }
    
    if (preset.tags && preset.tags.length > 10) {
      errors.push('Too many tags (max 10)')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get suggested tags based on filter content
   */
  static getSuggestedTags(filters: Partial<GlobalFilterState>): string[] {
    const tags: string[] = []
    
    if (filters.statuses?.length) {
      tags.push('status')
      if (filters.statuses.includes('completed')) tags.push('completed')
      if (filters.statuses.includes('in_progress')) tags.push('active')
    }
    
    if (filters.priorities?.length) {
      tags.push('priority')
      if (filters.priorities.includes('high')) tags.push('urgent')
    }
    
    if (filters.startDate || filters.endDate) {
      tags.push('time')
      // Check if current date falls within the filter range
      const now = new Date()
      const currentYear = now.getFullYear()
      const thisYear = `${currentYear}`
      if (filters.startDate?.includes(thisYear) || filters.endDate?.includes(thisYear)) {
        tags.push('current')
      }
    }
    
    if (filters.progressMin !== undefined || filters.progressMax !== undefined) {
      tags.push('progress')
      if (filters.progressMax !== undefined && filters.progressMax <= 30) tags.push('attention')
      if (filters.progressMin !== undefined && filters.progressMin >= 80) tags.push('completion')
    }
    
    if (filters.areas?.length) {
      tags.push('area')
    }
    
    if (filters.searchQuery) {
      tags.push('search')
    }
    
    return Array.from(new Set(tags)) // Remove duplicates
  }
}

/**
 * React hook for filter preset management
 */
export function useFilterPresets() {
  const getAllPresets = () => FilterPresetManager.getAllPresets()
  const getUserPresets = () => FilterPresetManager.getUserPresets()
  const getSystemPresets = () => SYSTEM_PRESETS
  
  const createPreset = (
    name: string,
    filters: Partial<GlobalFilterState>,
    description?: string,
    tags?: string[]
  ) => FilterPresetManager.createPreset(name, filters, description, tags)
  
  const updatePreset = (id: string, updates: Partial<FilterPreset>) => 
    FilterPresetManager.updatePreset(id, updates)
  
  const deletePreset = (id: string) => FilterPresetManager.deletePreset(id)
  
  const getPreset = (id: string) => FilterPresetManager.getPreset(id)
  
  const searchPresets = (query: string) => FilterPresetManager.searchPresets(query)
  
  const recordUsage = (id: string) => FilterPresetManager.recordPresetUsage(id)
  
  const getMostUsed = (limit?: number) => FilterPresetManager.getMostUsedPresets(limit)
  
  const getRecentlyUsed = (limit?: number) => FilterPresetManager.getRecentlyUsedPresets(limit)
  
  const exportPresets = () => FilterPresetManager.exportPresets()
  
  const importPresets = (jsonData: string) => FilterPresetManager.importPresets(jsonData)
  
  const validatePreset = (preset: Partial<FilterPreset>) => FilterPresetManager.validatePreset(preset)
  
  const getSuggestedTags = (filters: Partial<GlobalFilterState>) => 
    FilterPresetManager.getSuggestedTags(filters)

  return {
    getAllPresets,
    getUserPresets,
    getSystemPresets,
    createPreset,
    updatePreset,
    deletePreset,
    getPreset,
    searchPresets,
    recordUsage,
    getMostUsed,
    getRecentlyUsed,
    exportPresets,
    importPresets,
    validatePreset,
    getSuggestedTags
  }
}