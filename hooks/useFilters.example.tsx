/**
 * Example usage of enhanced useFilters hook
 * Project Reference: FILTER-IMPL-2025
 * 
 * This file demonstrates how to use the enhanced filtering capabilities.
 * Remove this file after implementation is complete.
 */

import { useEnhancedFilters, useLegacyFilters } from './useFilters'

// Example 1: Enhanced filters with all new capabilities
export function ExampleEnhancedComponent() {
  const {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
    hasActiveFilters,
    applyFilters,
    toQueryParams,
    clearFilterType,
    getFilterSummary,
    saveFilterPreset,
    loadFilterPreset,
    getFilterPresets
  } = useEnhancedFilters({
    onFiltersChange: (filters) => {
      console.log('Enhanced filters changed:', filters)
    }
  })

  // Example usage of new filter capabilities
  const handleSearch = (query: string) => {
    updateFilters({ searchQuery: query })
  }

  const handleObjectiveFilter = (objectiveIds: string[]) => {
    updateFilters({ objectiveIds })
  }

  const handleInitiativeFilter = (initiativeIds: string[]) => {
    updateFilters({ initiativeIds })
  }

  const handleAssigneeFilter = (assignedTo: string[]) => {
    updateFilters({ assignedTo })
  }

  // Convert to API query parameters
  const apiParams = toQueryParams()
  
  // Get filter summary for display
  const filterSummary = getFilterSummary()

  return (
    <div>
      <h3>Enhanced Filters Example</h3>
      <p>Active filters: {getActiveFilterCount()}</p>
      <p>Filter summary: {filterSummary.join(', ')}</p>
      
      {/* Search input */}
      <input
        type="text"
        placeholder="Search..."
        value={filters.searchQuery || ''}
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      {/* Clear specific filter types */}
      <button onClick={() => clearFilterType('searchQuery')}>
        Clear Search
      </button>
      
      <button onClick={() => clearFilterType('objectiveIds')}>
        Clear Objectives
      </button>
      
      {/* Reset all filters */}
      <button onClick={resetFilters}>Reset All</button>
      
      {/* Save/Load presets */}
      <button onClick={() => saveFilterPreset('my-preset')}>
        Save Current Preset
      </button>
      
      <button onClick={() => loadFilterPreset('my-preset')}>
        Load Preset
      </button>
    </div>
  )
}

// Example 2: Legacy filters for backward compatibility
export function ExampleLegacyComponent() {
  const {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
    hasActiveFilters,
    applyFilters
  } = useLegacyFilters({
    onFiltersChange: (filters) => {
      console.log('Legacy filters changed:', filters)
    }
  })

  // Only has access to original filter fields
  const handleAreaFilter = (areas: string[]) => {
    updateFilters({ areas })
  }

  const handleStatusFilter = (statuses: string[]) => {
    updateFilters({ statuses })
  }

  return (
    <div>
      <h3>Legacy Filters Example</h3>
      <p>Active filters: {getActiveFilterCount()}</p>
      
      <button onClick={resetFilters}>Reset All</button>
    </div>
  )
}

// Example 3: Data filtering with enhanced filters
export function ExampleDataFiltering() {
  const { filters, applyFilters } = useEnhancedFilters()

  // Sample data
  const initiatives = [
    {
      id: '1',
      title: 'Launch New Product',
      description: 'Product launch initiative',
      area_id: 'area-1',
      objective_id: 'obj-1',
      assigned_to: 'user-1',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      start_date: '2025-01-01',
      due_date: '2025-03-31'
    },
    {
      id: '2',
      title: 'Market Research',
      description: 'Conduct market analysis',
      area_id: 'area-2',
      objective_id: 'obj-2',
      assigned_to: 'user-2',
      status: 'planning',
      priority: 'medium',
      progress: 25,
      start_date: '2025-02-01',
      due_date: '2025-04-30'
    }
  ]

  // Apply filters to data
  const filteredInitiatives = applyFilters(initiatives)

  return (
    <div>
      <h3>Filtered Data Example</h3>
      <p>Total initiatives: {initiatives.length}</p>
      <p>Filtered initiatives: {filteredInitiatives.length}</p>
      
      <ul>
        {filteredInitiatives.map(initiative => (
          <li key={initiative.id}>
            {initiative.title} - {initiative.status} ({initiative.progress}%)
          </li>
        ))}
      </ul>
    </div>
  )
}