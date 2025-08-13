export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle values that might contain commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value ?? ''
      }).join(',')
    )
  ].join('\n')
  
  // Create and download blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  // Clean up
  window.URL.revokeObjectURL(url)
}

export function prepareAnalyticsExport(data: any[], type: string) {
  switch (type) {
    case 'area-comparison':
      return data.map(item => ({
        'Area': item.area,
        'Objectives': item.objectives,
        'Completed Objectives': item.completedObjectives,
        'Average Progress (%)': item.averageProgress,
        'Initiatives': item.initiatives,
        'Completed Initiatives': item.completedInitiatives,
        'Overall Score (%)': item.overallScore,
        'Status': item.status
      }))
    
    case 'progress-distribution':
      return data.map(item => ({
        'Progress Range': item.range,
        'Count': item.count,
        'Percentage (%)': item.percentage
      }))
    
    case 'status-distribution':
      return data.map(item => ({
        'Status': item.status,
        'Count': item.count,
        'Percentage (%)': item.percentage
      }))
    
    case 'trend-analytics':
      return data.map(item => ({
        'Date': new Date(item.date).toLocaleDateString(),
        'Overall Progress (%)': item.overallProgress,
        'Completed Initiatives': item.completedInitiatives,
        'New Initiatives': item.newInitiatives,
        'At Risk Initiatives': item.atRiskInitiatives
      }))
    
    default:
      return data
  }
}