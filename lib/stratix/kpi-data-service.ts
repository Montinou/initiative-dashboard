/**
 * Stratix KPI Data Service
 * 
 * Provides structured KPI data optimized for AI consumption,
 * supporting natural language queries and intelligent insights.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { createClient } from '@/utils/supabase/client'
// KPI calculation interfaces (moved from server-side calculator)
export interface KPIFilters {
  date_range?: {
    start: string
    end: string
  }
  area_id?: string
  initiative_status?: string[]
}
import type { CompanyContext } from './data-service'

// ===================================================================================
// TYPES FOR AI CONSUMPTION
// ===================================================================================

export interface AIKPIData {
  // Core metrics structured for AI analysis
  summary: {
    performance_score: number
    risk_level: 'low' | 'medium' | 'high'
    efficiency_rating: number
    trend_direction: 'improving' | 'stable' | 'declining'
    overall_health: 'excellent' | 'good' | 'concerning' | 'critical'
  }
  
  // KPI data organized by category for context
  categories: {
    performance: AIKPIMetric[]
    financial: AIKPIMetric[]
    operational: AIKPIMetric[]
    strategic: AIKPIMetric[]
    risk: AIKPIMetric[]
  }
  
  // Area-specific insights for managers
  area_focus?: {
    area_name: string
    performance_vs_company: 'above' | 'at' | 'below'
    key_challenges: string[]
    opportunities: string[]
    recommendations: string[]
  }
  
  // Trends for predictive analysis
  trends: {
    initiatives_velocity: number
    completion_rate_trend: number
    budget_efficiency_trend: number
    risk_escalation_rate: number
  }
  
  // Natural language context for AI
  context: {
    company_stage: 'startup' | 'growth' | 'mature' | 'enterprise'
    primary_focus: string[]
    current_challenges: string[]
    success_patterns: string[]
  }
  
  // Metadata for query processing
  metadata: {
    data_freshness: string
    user_role: string
    time_range: string
    confidence_level: number
  }
}

export interface AIKPIMetric {
  name: string
  value: number | string
  unit?: string
  target?: number | string
  performance: 'excellent' | 'good' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  trend_value: number
  impact_level: 'high' | 'medium' | 'low'
  description: string
  actionable_insights: string[]
}

export interface AIInsight {
  type: 'opportunity' | 'risk' | 'recommendation' | 'pattern'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  affected_areas: string[]
  potential_impact: string
  suggested_actions: string[]
  confidence_score: number
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
}

export interface PredictionResult {
  initiative_id: string
  success_probability: number
  risk_factors: string[]
  success_indicators: string[]
  recommended_interventions: string[]
  confidence_level: number
  prediction_timeframe: string
}

export interface NaturalLanguageQuery {
  query: string
  intent: 'status' | 'analysis' | 'prediction' | 'recommendation' | 'comparison'
  entities: string[]
  time_context?: string
  area_context?: string
}

// ===================================================================================
// STRATIX KPI DATA SERVICE
// ===================================================================================

export class StratixKPIDataService {
  private supabase = createClient()
  
  /**
   * Get structured KPI data optimized for AI consumption
   */
  async getKPIForAI(
    tenantId: string,
    userRole: string,
    userAreaId?: string,
    timeRange: string = 'current'
  ): Promise<AIKPIData> {
    try {
      console.log('🤖 Generating AI-optimized KPI data for:', userRole, timeRange)
      
      // Build filters based on time range
      const filters = this.buildFilters(timeRange)
      
      // Get comprehensive KPI data using client-side calculations
      const [summary, areaMetrics, strategicMetrics] = await Promise.all([
        this.calculateClientKPISummary(tenantId, filters, userRole, userAreaId),
        this.getClientAreaKPIMetrics(tenantId, userRole, userAreaId),
        userRole === 'CEO' || userRole === 'Admin' 
          ? this.getClientStrategicMetrics(tenantId)
          : null
      ])
      
      // Transform data for AI consumption
      const aiData = await this.transformToAIFormat(
        summary,
        areaMetrics,
        strategicMetrics,
        tenantId,
        userRole,
        userAreaId,
        timeRange
      )
      
      console.log('✅ AI KPI data generated with confidence:', aiData.metadata.confidence_level)
      return aiData
      
    } catch (error) {
      console.error('Error generating AI KPI data:', error)
      throw error
    }
  }
  
  /**
   * Generate intelligent insights based on KPI patterns
   */
  async generateInsights(kpiData: AIKPIData): Promise<AIInsight[]> {
    const insights: AIInsight[] = []
    
    // Analyze performance patterns
    const performanceInsights = this.analyzePerformancePatterns(kpiData)
    insights.push(...performanceInsights)
    
    // Analyze risk patterns
    const riskInsights = this.analyzeRiskPatterns(kpiData)
    insights.push(...riskInsights)
    
    // Analyze efficiency opportunities
    const efficiencyInsights = this.analyzeEfficiencyOpportunities(kpiData)
    insights.push(...efficiencyInsights)
    
    // Sort by priority and confidence
    return insights
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority] - priorityOrder[a.priority]) ||
               (b.confidence_score - a.confidence_score)
      })
      .slice(0, 10) // Top 10 insights
  }
  
  /**
   * Process natural language queries about initiative metrics
   */
  async queryInitiativeMetrics(
    tenantId: string,
    query: string,
    userRole: string,
    userAreaId?: string
  ): Promise<string> {
    try {
      console.log('🔍 Processing natural language query:', query)
      
      // Parse query to understand intent
      const parsedQuery = this.parseNaturalLanguageQuery(query)
      
      // Get relevant KPI data
      const kpiData = await this.getKPIForAI(tenantId, userRole, userAreaId)
      
      // Generate contextual response
      const response = this.generateQueryResponse(parsedQuery, kpiData, userRole)
      
      console.log('✅ Natural language query processed')
      return response
      
    } catch (error) {
      console.error('Error processing query:', error)
      throw error
    }
  }
  
  /**
   * Predict initiative success probability
   */
  async predictInitiativeSuccess(
    tenantId: string,
    initiativeId: string,
    userRole: string
  ): Promise<PredictionResult> {
    try {
      console.log('🔮 Predicting success for initiative:', initiativeId)
      
      // Get initiative details and historical patterns
      const { data: initiative, error } = await this.supabase
        .from('initiatives')
        .select(`
          *,
          areas(name),
          progress_history(
            previous_progress,
            new_progress,
            created_at,
            progress_notes,
            obstacles,
            enhancers
          ),
          subtasks(
            id,
            completed
          ),
          activities(
            id,
            status,
            progress
          )
        `)
        .eq('id', initiativeId)
        
        .single()
      
      if (error || !initiative) {
        throw new Error('Initiative not found')
      }
      
      // Analyze success patterns
      const prediction = this.analyzePredictiveFactors(initiative)
      
      console.log('✅ Success prediction generated with', prediction.confidence_level, 'confidence')
      return prediction
      
    } catch (error) {
      console.error('Error predicting initiative success:', error)
      throw error
    }
  }
  
  // ===================================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================================
  
  private buildFilters(timeRange: string): KPIFilters {
    const filters: KPIFilters = {}
    
    if (timeRange !== 'current') {
      const now = new Date()
      let startDate: Date
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      }
      
      filters.date_range = {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    }
    
    return filters
  }
  
  private async transformToAIFormat(
    summary: any,
    areaMetrics: any[],
    strategicMetrics: any,
    tenantId: string,
    userRole: string,
    userAreaId?: string,
    timeRange: string = 'current'
  ): Promise<AIKPIData> {
    
    // Calculate overall performance score
    const performanceScore = this.calculatePerformanceScore(summary, areaMetrics)
    
    // Determine risk level
    const riskLevel = this.calculateRiskLevel(summary, areaMetrics)
    
    // Calculate efficiency rating
    const efficiencyRating = this.calculateEfficiencyRating(summary)
    
    // Determine trend direction
    const trendDirection = this.calculateTrendDirection(summary, areaMetrics)
    
    // Categorize KPIs for AI analysis
    const categories = this.categorizeKPIs(summary, areaMetrics, strategicMetrics)
    
    // Generate area-specific focus for managers
    const areaFocus = userRole === 'Manager' && userAreaId 
      ? await this.generateAreaFocus(tenantId, userAreaId, areaMetrics)
      : undefined
    
    // Calculate trends for predictive analysis
    const trends = await this.calculatePredictiveTrends(tenantId, userRole, userAreaId)
    
    // Generate natural language context
    const context = this.generateNaturalLanguageContext(summary, areaMetrics, userRole)
    
    return {
      summary: {
        performance_score: performanceScore,
        risk_level: riskLevel,
        efficiency_rating: efficiencyRating,
        trend_direction: trendDirection,
        overall_health: this.calculateOverallHealth(performanceScore, riskLevel, efficiencyRating)
      },
      categories,
      area_focus: areaFocus,
      trends,
      context,
      metadata: {
        data_freshness: new Date().toISOString(),
        user_role: userRole,
        time_range: timeRange,
        confidence_level: this.calculateConfidenceLevel(summary, areaMetrics)
      }
    }
  }
  
  private calculatePerformanceScore(summary: any, areaMetrics: any[]): number {
    // Weighted performance calculation
    const completionWeight = 0.3
    const progressWeight = 0.3
    const budgetWeight = 0.2
    const timelinessWeight = 0.2
    
    const completionScore = (summary?.completion_rate || 0)
    const progressScore = (summary?.average_progress || 0)
    const budgetScore = Math.max(0, 100 - Math.abs((summary?.budget_variance || 0)))
    const timelinessScore = Math.max(0, 100 - (summary?.overdue_count || 0) * 10)
    
    return Math.round(
      completionScore * completionWeight +
      progressScore * progressWeight +
      budgetScore * budgetWeight +
      timelinessScore * timelinessWeight
    )
  }
  
  private calculateRiskLevel(summary: any, areaMetrics: any[]): 'low' | 'medium' | 'high' {
    const overdueCount = summary?.overdue_count || 0
    const budgetVariance = Math.abs(summary?.budget_variance || 0)
    const lowProgressCount = summary?.low_progress_count || 0
    
    if (overdueCount > 5 || budgetVariance > 25 || lowProgressCount > 3) {
      return 'high'
    } else if (overdueCount > 2 || budgetVariance > 15 || lowProgressCount > 1) {
      return 'medium'
    }
    return 'low'
  }
  
  private calculateEfficiencyRating(summary: any): number {
    const budgetEfficiency = summary?.budget_efficiency || 100
    const resourceUtilization = summary?.resource_utilization || 100
    const timeEfficiency = summary?.time_efficiency || 100
    
    return Math.round((budgetEfficiency + resourceUtilization + timeEfficiency) / 3)
  }
  
  private calculateTrendDirection(summary: any, areaMetrics: any[]): 'improving' | 'stable' | 'declining' {
    const trends = [
      summary?.completion_trend || 0,
      summary?.progress_trend || 0,
      summary?.budget_trend || 0
    ]
    
    const avgTrend = trends.reduce((sum, trend) => sum + trend, 0) / trends.length
    
    if (avgTrend > 2) return 'improving'
    if (avgTrend < -2) return 'declining'
    return 'stable'
  }
  
  private calculateOverallHealth(
    performanceScore: number, 
    riskLevel: 'low' | 'medium' | 'high', 
    efficiencyRating: number
  ): 'excellent' | 'good' | 'concerning' | 'critical' {
    if (performanceScore >= 85 && riskLevel === 'low' && efficiencyRating >= 80) {
      return 'excellent'
    } else if (performanceScore >= 70 && riskLevel !== 'high' && efficiencyRating >= 70) {
      return 'good'
    } else if (performanceScore >= 50 || riskLevel === 'high') {
      return 'concerning'
    }
    return 'critical'
  }
  
  private categorizeKPIs(summary: any, areaMetrics: any[], strategicMetrics: any): AIKPIData['categories'] {
    return {
      performance: [
        {
          name: 'Completion Rate',
          value: summary?.completion_rate || 0,
          unit: '%',
          target: 85,
          performance: this.getPerformanceLevel(summary?.completion_rate || 0, 85),
          trend: summary?.completion_trend > 0 ? 'up' : summary?.completion_trend < 0 ? 'down' : 'stable',
          trend_value: summary?.completion_trend || 0,
          impact_level: 'high',
          description: 'Overall initiative completion rate across the organization',
          actionable_insights: this.generateCompletionInsights(summary?.completion_rate || 0)
        },
        {
          name: 'Average Progress',
          value: summary?.average_progress || 0,
          unit: '%',
          target: 75,
          performance: this.getPerformanceLevel(summary?.average_progress || 0, 75),
          trend: summary?.progress_trend > 0 ? 'up' : summary?.progress_trend < 0 ? 'down' : 'stable',
          trend_value: summary?.progress_trend || 0,
          impact_level: 'high',
          description: 'Average progress across all active initiatives',
          actionable_insights: this.generateProgressInsights(summary?.average_progress || 0)
        }
      ],
      financial: [
        {
          name: 'Budget Efficiency',
          value: summary?.budget_efficiency || 100,
          unit: '%',
          target: 90,
          performance: this.getPerformanceLevel(summary?.budget_efficiency || 100, 90),
          trend: summary?.budget_trend > 0 ? 'up' : summary?.budget_trend < 0 ? 'down' : 'stable',
          trend_value: summary?.budget_trend || 0,
          impact_level: 'medium',
          description: 'Efficiency of budget utilization across initiatives',
          actionable_insights: this.generateBudgetInsights(summary?.budget_efficiency || 100)
        }
      ],
      operational: [
        {
          name: 'Active Initiatives',
          value: summary?.active_count || 0,
          unit: 'initiatives',
          performance: 'good',
          trend: 'stable',
          trend_value: 0,
          impact_level: 'medium',
          description: 'Number of initiatives currently in progress',
          actionable_insights: ['Monitor capacity and resource allocation']
        }
      ],
      strategic: strategicMetrics ? [
        {
          name: 'Strategic Alignment',
          value: strategicMetrics?.alignment_score || 0,
          unit: '%',
          target: 80,
          performance: this.getPerformanceLevel(strategicMetrics?.alignment_score || 0, 80),
          trend: 'stable',
          trend_value: 0,
          impact_level: 'high',
          description: 'Alignment of initiatives with strategic objectives',
          actionable_insights: ['Review strategic initiative portfolio']
        }
      ] : [],
      risk: [
        {
          name: 'Overdue Initiatives',
          value: summary?.overdue_count || 0,
          unit: 'initiatives',
          performance: (summary?.overdue_count || 0) === 0 ? 'excellent' : 
                      (summary?.overdue_count || 0) <= 2 ? 'good' : 
                      (summary?.overdue_count || 0) <= 5 ? 'warning' : 'critical',
          trend: summary?.overdue_trend > 0 ? 'down' : summary?.overdue_trend < 0 ? 'up' : 'stable',
          trend_value: -(summary?.overdue_trend || 0),
          impact_level: 'high',
          description: 'Initiatives past their target completion date',
          actionable_insights: this.generateRiskInsights(summary?.overdue_count || 0)
        }
      ]
    }
  }
  
  private async generateAreaFocus(
    tenantId: string,
    areaId: string,
    areaMetrics: any[]
  ): Promise<AIKPIData['area_focus']> {
    const areaData = areaMetrics?.find(area => area.id === areaId)
    if (!areaData) return undefined
    
    const companyAverage = areaMetrics.reduce((sum, area) => sum + (area.completion_rate || 0), 0) / areaMetrics.length
    
    return {
      area_name: areaData.name,
      performance_vs_company: areaData.completion_rate > companyAverage + 5 ? 'above' :
                              areaData.completion_rate < companyAverage - 5 ? 'below' : 'at',
      key_challenges: this.identifyAreaChallenges(areaData),
      opportunities: this.identifyAreaOpportunities(areaData),
      recommendations: this.generateAreaRecommendations(areaData)
    }
  }
  
  private async calculatePredictiveTrends(
    tenantId: string,
    userRole: string,
    userAreaId?: string
  ): Promise<AIKPIData['trends']> {
    try {
      // Get historical data for trend analysis (last 90 days)
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000))
      
      // Query historical initiatives data
      const { data: historicalData } = await supabase
        .from('initiatives')
        .select(`
          id,
          status,
          progress,
          budget,
          actual_cost,
          created_at,
          updated_at,
          completion_date,
          target_date
        `)
        
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (!historicalData || historicalData.length === 0) {
        // Return neutral trends if no historical data
        return {
          initiatives_velocity: 0,
          completion_rate_trend: 0,
          budget_efficiency_trend: 0,
          risk_escalation_rate: 0
        }
      }
      
      // Calculate initiatives velocity (initiatives completed per week)
      const completedInitiatives = historicalData.filter(i => i.status === 'completed')
      const weeksInPeriod = 13 // ~90 days / 7
      const currentVelocity = completedInitiatives.length / weeksInPeriod
      
      // Compare with previous period velocity
      const midPoint = new Date(startDate.getTime() + (45 * 24 * 60 * 60 * 1000))
      const earlyPeriodCompleted = completedInitiatives.filter(i => 
        new Date(i.completion_date || i.updated_at) < midPoint
      ).length
      const latePeriodCompleted = completedInitiatives.length - earlyPeriodCompleted
      
      const earlyVelocity = earlyPeriodCompleted / 6.5 // first half
      const lateVelocity = latePeriodCompleted / 6.5 // second half
      const velocityTrend = earlyVelocity > 0 ? ((lateVelocity - earlyVelocity) / earlyVelocity) : 0
      
      // Calculate completion rate trend
      const totalInitiatives = historicalData.length
      const completionRate = completedInitiatives.length / totalInitiatives
      
      // Compare completion rates over time periods
      const earlyPeriodTotal = historicalData.filter(i => 
        new Date(i.created_at) < midPoint
      ).length
      const latePeriodTotal = totalInitiatives - earlyPeriodTotal
      const earlyCompletionRate = earlyPeriodTotal > 0 ? earlyPeriodCompleted / earlyPeriodTotal : 0
      const lateCompletionRate = latePeriodTotal > 0 ? latePeriodCompleted / latePeriodTotal : 0
      const completionRateTrend = earlyCompletionRate > 0 ? 
        ((lateCompletionRate - earlyCompletionRate) / earlyCompletionRate) : 0
      
      // Calculate budget efficiency trend
      const budgetedInitiatives = historicalData.filter(i => i.budget && i.actual_cost)
      let budgetEfficiencyTrend = 0
      
      if (budgetedInitiatives.length > 2) {
        const budgetVariances = budgetedInitiatives.map(i => 
          (i.budget - i.actual_cost) / i.budget
        )
        const avgVariance = budgetVariances.reduce((sum, v) => sum + v, 0) / budgetVariances.length
        
        // Calculate trend by comparing first and second half variances
        const halfPoint = Math.floor(budgetVariances.length / 2)
        const earlyVariances = budgetVariances.slice(0, halfPoint)
        const lateVariances = budgetVariances.slice(halfPoint)
        
        const earlyAvgVariance = earlyVariances.reduce((sum, v) => sum + v, 0) / earlyVariances.length
        const lateAvgVariance = lateVariances.reduce((sum, v) => sum + v, 0) / lateVariances.length
        
        budgetEfficiencyTrend = earlyAvgVariance !== 0 ? 
          ((lateAvgVariance - earlyAvgVariance) / Math.abs(earlyAvgVariance)) : 0
      }
      
      // Calculate risk escalation rate (overdue initiatives trend)
      const overdueInitiatives = historicalData.filter(i => 
        i.target_date && 
        i.status !== 'completed' && 
        new Date(i.target_date) < new Date()
      )
      const riskEscalationRate = overdueInitiatives.length / totalInitiatives
      
      // Normalize trends to reasonable ranges (-1 to 1)
      const normalizedVelocityTrend = Math.max(-1, Math.min(1, velocityTrend))
      const normalizedCompletionTrend = Math.max(-1, Math.min(1, completionRateTrend))
      const normalizedBudgetTrend = Math.max(-1, Math.min(1, budgetEfficiencyTrend))
      const normalizedRiskRate = Math.max(0, Math.min(1, riskEscalationRate))
      
      return {
        initiatives_velocity: Number(normalizedVelocityTrend.toFixed(3)),
        completion_rate_trend: Number(normalizedCompletionTrend.toFixed(3)),
        budget_efficiency_trend: Number(normalizedBudgetTrend.toFixed(3)),
        risk_escalation_rate: Number(normalizedRiskRate.toFixed(3))
      }
    } catch (error) {
      console.error('❌ Failed to generate trend data:', error)
      // Return neutral trends on error
      return {
        initiatives_velocity: 0,
        completion_rate_trend: 0,
        budget_efficiency_trend: 0,
        risk_escalation_rate: 0
      }
    }
  }
  
  private generateNaturalLanguageContext(
    summary: any,
    areaMetrics: any[],
    userRole: string
  ): AIKPIData['context'] {
    const totalInitiatives = summary?.total_count || 0
    const completionRate = summary?.completion_rate || 0
    
    // Determine company stage based on metrics
    let companyStage: 'startup' | 'growth' | 'mature' | 'enterprise'
    if (totalInitiatives < 10) companyStage = 'startup'
    else if (totalInitiatives < 50) companyStage = 'growth'
    else if (totalInitiatives < 200) companyStage = 'mature'
    else companyStage = 'enterprise'
    
    // Identify primary focus areas
    const primaryFocus = []
    if (completionRate < 70) primaryFocus.push('execution improvement')
    if (summary?.budget_variance > 15) primaryFocus.push('budget optimization')
    if (summary?.overdue_count > 3) primaryFocus.push('timeline management')
    if (primaryFocus.length === 0) primaryFocus.push('strategic growth')
    
    return {
      company_stage: companyStage,
      primary_focus: primaryFocus,
      current_challenges: this.identifyCurrentChallenges(summary),
      success_patterns: this.identifySuccessPatterns(areaMetrics)
    }
  }
  
  private calculateConfidenceLevel(summary: any, areaMetrics: any[]): number {
    // Base confidence on data completeness and freshness
    let confidence = 0.8
    
    if (summary && Object.keys(summary).length > 5) confidence += 0.1
    if (areaMetrics && areaMetrics.length > 0) confidence += 0.1
    
    return Math.min(confidence, 1.0)
  }
  
  // ===================================================================================
  // ANALYSIS METHODS
  // ===================================================================================
  
  private analyzePerformancePatterns(kpiData: AIKPIData): AIInsight[] {
    const insights: AIInsight[] = []
    
    if (kpiData.summary.performance_score > 85) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'Excellent Performance Momentum',
        description: 'Organization is performing exceptionally well with consistent delivery patterns',
        affected_areas: ['All Areas'],
        potential_impact: 'Maintain competitive advantage and explore expansion opportunities',
        suggested_actions: [
          'Document and share best practices across teams',
          'Consider increasing strategic initiative portfolio',
          'Invest in capability building for future growth'
        ],
        confidence_score: 0.9,
        timeframe: 'medium_term'
      })
    }
    
    return insights
  }
  
  private analyzeRiskPatterns(kpiData: AIKPIData): AIInsight[] {
    const insights: AIInsight[] = []
    
    if (kpiData.summary.risk_level === 'high') {
      insights.push({
        type: 'risk',
        priority: 'urgent',
        title: 'High Risk Level Detected',
        description: 'Multiple risk indicators suggest immediate attention required',
        affected_areas: kpiData.area_focus ? [kpiData.area_focus.area_name] : ['Multiple Areas'],
        potential_impact: 'Potential impact on strategic objectives and timeline delivery',
        suggested_actions: [
          'Conduct immediate risk assessment across all initiatives',
          'Reallocate resources to critical initiatives',
          'Implement weekly risk monitoring dashboard'
        ],
        confidence_score: 0.95,
        timeframe: 'immediate'
      })
    }
    
    return insights
  }
  
  private analyzeEfficiencyOpportunities(kpiData: AIKPIData): AIInsight[] {
    const insights: AIInsight[] = []
    
    if (kpiData.summary.efficiency_rating < 70) {
      insights.push({
        type: 'recommendation',
        priority: 'high',
        title: 'Efficiency Improvement Opportunity',
        description: 'Analysis shows significant opportunities for process optimization',
        affected_areas: ['Operations'],
        potential_impact: '15-25% improvement in resource utilization possible',
        suggested_actions: [
          'Conduct process audit to identify bottlenecks',
          'Implement automation for repetitive tasks',
          'Standardize workflows across similar initiatives'
        ],
        confidence_score: 0.8,
        timeframe: 'short_term'
      })
    }
    
    return insights
  }
  
  private parseNaturalLanguageQuery(query: string): NaturalLanguageQuery {
    const lowercaseQuery = query.toLowerCase()
    
    // Simple intent detection
    let intent: NaturalLanguageQuery['intent'] = 'status'
    if (lowercaseQuery.includes('predict') || lowercaseQuery.includes('forecast')) intent = 'prediction'
    else if (lowercaseQuery.includes('recommend') || lowercaseQuery.includes('suggest')) intent = 'recommendation'
    else if (lowercaseQuery.includes('compare') || lowercaseQuery.includes('vs')) intent = 'comparison'
    else if (lowercaseQuery.includes('analyze') || lowercaseQuery.includes('why')) intent = 'analysis'
    
    // Extract entities
    const entities = []
    if (lowercaseQuery.includes('budget')) entities.push('budget')
    if (lowercaseQuery.includes('progress')) entities.push('progress')
    if (lowercaseQuery.includes('completion')) entities.push('completion')
    if (lowercaseQuery.includes('risk')) entities.push('risk')
    
    return {
      query,
      intent,
      entities,
      time_context: this.extractTimeContext(lowercaseQuery),
      area_context: this.extractAreaContext(lowercaseQuery)
    }
  }
  
  private generateQueryResponse(
    parsedQuery: NaturalLanguageQuery,
    kpiData: AIKPIData,
    userRole: string
  ): string {
    const { intent, entities } = parsedQuery
    
    let response = ''
    
    switch (intent) {
      case 'status':
        response = this.generateStatusResponse(kpiData, entities, userRole)
        break
      case 'analysis':
        response = this.generateAnalysisResponse(kpiData, entities, userRole)
        break
      case 'prediction':
        response = this.generatePredictionResponse(kpiData, entities, userRole)
        break
      case 'recommendation':
        response = this.generateRecommendationResponse(kpiData, entities, userRole)
        break
      case 'comparison':
        response = this.generateComparisonResponse(kpiData, entities, userRole)
        break
      default:
        response = this.generateDefaultResponse(kpiData, userRole)
    }
    
    return response
  }
  
  private analyzePredictiveFactors(initiative: any): PredictionResult {
    // Analyze historical progress patterns
    const progressHistory = initiative.progress_history || []
    const consistentProgress = this.calculateProgressConsistency(progressHistory)
    
    // Analyze subtask completion patterns
    const subtasks = initiative.subtasks || []
    const subtaskCompletionRate = subtasks.length > 0 
      ? subtasks.filter((st: any) => st.completed).length / subtasks.length 
      : 0
    
    // Analyze activities status
    const activities = initiative.activities || []
    const activeActivities = activities.filter((act: any) => act.status === 'En Progreso').length
    
    // Calculate success probability
    let successProbability = 0.5 // Base probability
    
    // Adjust based on current progress
    if (initiative.progress > 80) successProbability += 0.3
    else if (initiative.progress > 60) successProbability += 0.2
    else if (initiative.progress > 40) successProbability += 0.1
    else if (initiative.progress < 20) successProbability -= 0.2
    
    // Adjust based on timeline
    if (initiative.target_date) {
      const daysToTarget = Math.ceil((new Date(initiative.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysToTarget < 0) successProbability -= 0.3 // Overdue
      else if (daysToTarget < 30) successProbability += 0.1 // Soon
    }
    
    // Adjust based on subtask completion
    successProbability += (subtaskCompletionRate - 0.5) * 0.2
    
    // Adjust based on progress consistency
    successProbability += consistentProgress * 0.1
    
    // Cap between 0 and 1
    successProbability = Math.max(0, Math.min(1, successProbability))
    
    return {
      initiative_id: initiative.id,
      success_probability: Math.round(successProbability * 100) / 100,
      risk_factors: this.identifyRiskFactors(initiative),
      success_indicators: this.identifySuccessIndicators(initiative),
      recommended_interventions: this.generateInterventions(initiative, successProbability),
      confidence_level: this.calculatePredictionConfidence(initiative),
      prediction_timeframe: this.calculatePredictionTimeframe(initiative)
    }
  }
  
  // ===================================================================================
  // UTILITY METHODS
  // ===================================================================================
  
  private getPerformanceLevel(value: number, target: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const ratio = value / target
    if (ratio >= 1) return 'excellent'
    if (ratio >= 0.8) return 'good'
    if (ratio >= 0.6) return 'warning'
    return 'critical'
  }
  
  private generateCompletionInsights(completionRate: number): string[] {
    if (completionRate >= 85) return ['Excellent completion rate - maintain current practices']
    if (completionRate >= 70) return ['Good completion rate - identify areas for improvement']
    return ['Low completion rate - urgent review of project management practices needed']
  }
  
  private generateProgressInsights(averageProgress: number): string[] {
    if (averageProgress >= 75) return ['Strong progress momentum across initiatives']
    if (averageProgress >= 50) return ['Moderate progress - consider removing blockers']
    return ['Slow progress detected - investigate resource constraints']
  }
  
  private generateBudgetInsights(budgetEfficiency: number): string[] {
    if (budgetEfficiency >= 90) return ['Excellent budget management']
    if (budgetEfficiency >= 70) return ['Good budget control with room for optimization']
    return ['Budget variance requires immediate attention']
  }
  
  private generateRiskInsights(overdueCount: number): string[] {
    if (overdueCount === 0) return ['No overdue initiatives - excellent timeline management']
    if (overdueCount <= 2) return ['Few overdue initiatives - monitor closely']
    return ['Multiple overdue initiatives - immediate intervention required']
  }
  
  private identifyAreaChallenges(areaData: any): string[] {
    const challenges = []
    if ((areaData.completion_rate || 0) < 70) challenges.push('Low completion rate')
    if ((areaData.budget_variance || 0) > 15) challenges.push('Budget overruns')
    if ((areaData.overdue_count || 0) > 2) challenges.push('Timeline delays')
    return challenges.length > 0 ? challenges : ['No major challenges identified']
  }
  
  private identifyAreaOpportunities(areaData: any): string[] {
    const opportunities = []
    if ((areaData.completion_rate || 0) > 80) opportunities.push('High performance - potential for increased scope')
    if ((areaData.budget_efficiency || 0) > 90) opportunities.push('Excellent budget management - resource reallocation possible')
    return opportunities.length > 0 ? opportunities : ['Focus on execution improvement']
  }
  
  private generateAreaRecommendations(areaData: any): string[] {
    const recommendations = []
    if ((areaData.completion_rate || 0) < 70) recommendations.push('Implement stronger project tracking')
    if ((areaData.resource_utilization || 0) < 80) recommendations.push('Optimize resource allocation')
    recommendations.push('Regular performance reviews with team')
    return recommendations
  }
  
  private identifyCurrentChallenges(summary: any): string[] {
    const challenges = []
    if ((summary?.completion_rate || 0) < 70) challenges.push('execution effectiveness')
    if ((summary?.budget_variance || 0) > 15) challenges.push('budget management')
    if ((summary?.overdue_count || 0) > 3) challenges.push('timeline adherence')
    return challenges.length > 0 ? challenges : ['maintaining momentum']
  }
  
  private identifySuccessPatterns(areaMetrics: any[]): string[] {
    const patterns = []
    const highPerformingAreas = areaMetrics?.filter(area => (area.completion_rate || 0) > 80) || []
    if (highPerformingAreas.length > 0) patterns.push('strong area leadership')
    patterns.push('consistent progress tracking')
    return patterns
  }
  
  private extractTimeContext(query: string): string | undefined {
    if (query.includes('this week') || query.includes('weekly')) return 'week'
    if (query.includes('this month') || query.includes('monthly')) return 'month'
    if (query.includes('year') || query.includes('yearly') || query.includes('annual')) return 'year'
    return undefined
  }
  
  private extractAreaContext(query: string): string | undefined {
    // Simple area detection - could be enhanced with actual area names
    if (query.includes('my area') || query.includes('this area')) return 'current_area'
    return undefined
  }
  
  private generateStatusResponse(kpiData: AIKPIData, entities: string[], userRole: string): string {
    const performance = kpiData.summary.performance_score
    const health = kpiData.summary.overall_health
    
    let response = `📊 **Status Overview** (${userRole})\n\n`
    response += `Overall Health: **${health.toUpperCase()}** (${performance}% performance score)\n`
    response += `Risk Level: **${kpiData.summary.risk_level.toUpperCase()}**\n`
    response += `Trend: **${kpiData.summary.trend_direction.toUpperCase()}**\n\n`
    
    // Add entity-specific details
    if (entities.includes('budget')) {
      const budgetMetric = kpiData.categories.financial[0]
      if (budgetMetric) {
        response += `💰 Budget Efficiency: ${budgetMetric.value}${budgetMetric.unit} (${budgetMetric.performance})\n`
      }
    }
    
    if (entities.includes('progress')) {
      const progressMetric = kpiData.categories.performance.find(m => m.name.includes('Progress'))
      if (progressMetric) {
        response += `📈 Average Progress: ${progressMetric.value}${progressMetric.unit} (${progressMetric.performance})\n`
      }
    }
    
    return response
  }
  
  private generateAnalysisResponse(kpiData: AIKPIData, entities: string[], userRole: string): string {
    let response = `🔍 **Analysis Insights** (${userRole})\n\n`
    
    if (kpiData.summary.overall_health === 'critical') {
      response += `⚠️ **Critical Status Detected**\n`
      response += `Primary concerns: ${kpiData.context.current_challenges.join(', ')}\n\n`
    }
    
    response += `**Performance Drivers:**\n`
    response += `• Efficiency Rating: ${kpiData.summary.efficiency_rating}%\n`
    response += `• Trend Direction: ${kpiData.summary.trend_direction}\n`
    response += `• Risk Level: ${kpiData.summary.risk_level}\n\n`
    
    if (kpiData.area_focus && userRole === 'Manager') {
      response += `**Your Area (${kpiData.area_focus.area_name}):**\n`
      response += `• Performance vs Company: ${kpiData.area_focus.performance_vs_company}\n`
      response += `• Key Challenges: ${kpiData.area_focus.key_challenges.join(', ')}\n`
    }
    
    return response
  }
  
  private generatePredictionResponse(kpiData: AIKPIData, entities: string[], userRole: string): string {
    let response = `🔮 **Predictive Analysis** (${userRole})\n\n`
    
    response += `**Trend Predictions:**\n`
    response += `• Initiative Velocity: ${kpiData.trends.initiatives_velocity > 1 ? 'Accelerating' : 'Slowing'}\n`
    response += `• Completion Rate Trend: ${kpiData.trends.completion_rate_trend > 0 ? 'Improving' : 'Declining'}\n`
    response += `• Budget Efficiency: ${kpiData.trends.budget_efficiency_trend > 0 ? 'Improving' : 'Declining'}\n\n`
    
    if (kpiData.summary.risk_level === 'high') {
      response += `⚠️ **Risk Forecast:** High probability of timeline delays without intervention\n`
    }
    
    response += `**Confidence Level:** ${Math.round(kpiData.metadata.confidence_level * 100)}%\n`
    
    return response
  }
  
  private generateRecommendationResponse(kpiData: AIKPIData, entities: string[], userRole: string): string {
    let response = `💡 **Recommendations** (${userRole})\n\n`
    
    if (kpiData.summary.performance_score < 70) {
      response += `**Priority Actions:**\n`
      response += `• Focus on execution improvement\n`
      response += `• Implement stronger progress tracking\n`
      response += `• Review resource allocation\n\n`
    }
    
    if (kpiData.area_focus && userRole === 'Manager') {
      response += `**Area-Specific Recommendations:**\n`
      kpiData.area_focus.recommendations.forEach(rec => {
        response += `• ${rec}\n`
      })
    }
    
    if (kpiData.summary.risk_level === 'high') {
      response += `\n**Risk Mitigation:**\n`
      response += `• Conduct immediate initiative review\n`
      response += `• Reallocate resources to critical projects\n`
      response += `• Implement weekly risk monitoring\n`
    }
    
    return response
  }
  
  private generateComparisonResponse(kpiData: AIKPIData, entities: string[], userRole: string): string {
    let response = `📊 **Comparison Analysis** (${userRole})\n\n`
    
    if (kpiData.area_focus && userRole === 'Manager') {
      response += `**Your Area vs Company Average:**\n`
      response += `• Performance: ${kpiData.area_focus.performance_vs_company} average\n`
      response += `• Relative Position: ${kpiData.area_focus.performance_vs_company === 'above' ? 'Top performer' : 
                                       kpiData.area_focus.performance_vs_company === 'below' ? 'Needs improvement' : 'On par'}\n\n`
    }
    
    response += `**Benchmarking:**\n`
    response += `• Performance Score: ${kpiData.summary.performance_score}% (Target: 85%)\n`
    response += `• Efficiency Rating: ${kpiData.summary.efficiency_rating}% (Target: 90%)\n`
    
    return response
  }
  
  private generateDefaultResponse(kpiData: AIKPIData, userRole: string): string {
    return this.generateStatusResponse(kpiData, [], userRole)
  }
  
  private calculateProgressConsistency(progressHistory: any[]): number {
    if (progressHistory.length < 2) return 0.5
    
    const progressChanges = progressHistory.map(h => h.new_progress - h.previous_progress)
    const positiveChanges = progressChanges.filter(change => change > 0).length
    
    return positiveChanges / progressChanges.length
  }
  
  private identifyRiskFactors(initiative: any): string[] {
    const risks = []
    
    if (initiative.progress < 30 && initiative.target_date) {
      const daysToTarget = Math.ceil((new Date(initiative.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysToTarget < 60) risks.push('Low progress with approaching deadline')
    }
    
    if (initiative.budget && initiative.actual_cost && initiative.actual_cost > initiative.budget * 0.9) {
      risks.push('Budget nearly exhausted')
    }
    
    const recentProgress = initiative.progress_history?.slice(-3) || []
    if (recentProgress.every((p: any) => p.new_progress <= p.previous_progress)) {
      risks.push('No recent progress updates')
    }
    
    return risks.length > 0 ? risks : ['No significant risk factors identified']
  }
  
  private identifySuccessIndicators(initiative: any): string[] {
    const indicators = []
    
    if (initiative.progress > 60) indicators.push('Strong progress momentum')
    
    const subtaskCompletion = initiative.subtasks?.filter((st: any) => st.completed).length || 0
    const totalSubtasks = initiative.subtasks?.length || 0
    if (totalSubtasks > 0 && subtaskCompletion / totalSubtasks > 0.7) {
      indicators.push('High subtask completion rate')
    }
    
    if (initiative.progress_history?.length > 5) {
      indicators.push('Consistent progress tracking')
    }
    
    return indicators.length > 0 ? indicators : ['Initiative is actively managed']
  }
  
  private generateInterventions(initiative: any, successProbability: number): string[] {
    const interventions = []
    
    if (successProbability < 0.5) {
      interventions.push('Immediate stakeholder review required')
      interventions.push('Consider scope reduction or timeline extension')
      interventions.push('Increase resource allocation')
    } else if (successProbability < 0.7) {
      interventions.push('Weekly progress monitoring')
      interventions.push('Remove identified blockers')
      interventions.push('Ensure resource availability')
    } else {
      interventions.push('Continue current approach')
      interventions.push('Document best practices for replication')
    }
    
    return interventions
  }
  
  private calculatePredictionConfidence(initiative: any): number {
    let confidence = 0.6
    
    if (initiative.progress_history?.length > 5) confidence += 0.2
    if (initiative.subtasks?.length > 0) confidence += 0.1
    if (initiative.activities?.length > 0) confidence += 0.1
    
    return Math.min(confidence, 1.0)
  }
  
  private calculatePredictionTimeframe(initiative: any): string {
    if (initiative.target_date) {
      const daysToTarget = Math.ceil((new Date(initiative.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysToTarget < 30) return '1-4 weeks'
      if (daysToTarget < 90) return '1-3 months'
      return '3+ months'
    }
    return '2-6 months (estimated)'
  }

  // ===================================================================================
  // CLIENT-SIDE KPI CALCULATION METHODS
  // ===================================================================================

  private async calculateClientKPISummary(
    tenantId: string,
    filters: KPIFilters,
    userRole: string,
    userAreaId?: string
  ): Promise<any> {
    try {
      // Get initiatives data with basic filtering
      let query = this.supabase
        .from('initiatives')
        .select(`
          id,
          status,
          progress,
          budget,
          actual_cost,
          target_date,
          completion_date,
          area_id,
          created_at,
          updated_at
        `)
        

      // Apply role-based filtering
      if (userRole === 'Manager' && userAreaId) {
        query = query.eq('area_id', userAreaId)
      }

      // Apply date filters
      if (filters.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end)
      }

      const { data: initiatives, error } = await query

      if (error) {
        console.error('Error fetching initiatives for KPI summary:', error)
        throw error
      }

      // Calculate summary metrics
      const totalCount = initiatives?.length || 0
      const activeCount = initiatives?.filter(i => i.status === 'in_progress' || i.status === 'planning').length || 0
      const completedCount = initiatives?.filter(i => i.status === 'completed').length || 0
      const overdueCount = initiatives?.filter(i => 
        i.target_date && 
        new Date(i.target_date) < new Date() && 
        i.status !== 'completed'
      ).length || 0

      const averageProgress = totalCount > 0 
        ? Math.round(initiatives!.reduce((sum, i) => sum + (i.progress || 0), 0) / totalCount)
        : 0

      const completionRate = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100)
        : 0

      const totalBudget = initiatives?.reduce((sum, i) => sum + (i.budget || 0), 0) || 0
      const totalActualCost = initiatives?.reduce((sum, i) => sum + (i.actual_cost || 0), 0) || 0
      const budgetEfficiency = totalBudget > 0 
        ? Math.round(((totalBudget - totalActualCost) / totalBudget) * 100)
        : 100

      return {
        total_count: totalCount,
        active_count: activeCount,
        completed_count: completedCount,
        overdue_count: overdueCount,
        completion_rate: completionRate,
        average_progress: averageProgress,
        budget_efficiency: budgetEfficiency,
        budget_variance: totalBudget > 0 ? Math.abs(((totalActualCost - totalBudget) / totalBudget) * 100) : 0,
        completion_trend: 0, // Simplified - would need historical data
        progress_trend: 0,
        budget_trend: 0,
        overdue_trend: 0,
        low_progress_count: initiatives?.filter(i => (i.progress || 0) < 30).length || 0,
        resource_utilization: 85, // Simplified
        time_efficiency: averageProgress
      }

    } catch (error) {
      console.error('Error calculating KPI summary:', error)
      throw error
    }
  }

  private async getClientAreaKPIMetrics(
    tenantId: string,
    userRole: string,
    userAreaId?: string
  ): Promise<any[]> {
    try {
      // Get areas data
      let query = this.supabase
        .from('areas')
        .select(`
          id,
          name,
          description,
          initiatives!inner(
            id,
            status,
            progress,
            budget,
            actual_cost,
            target_date,
            completion_date
          )
        `)
        
        .eq('is_active', true)

      // Apply role-based filtering
      if (userRole === 'Manager' && userAreaId) {
        query = query.eq('id', userAreaId)
      }

      const { data: areas, error } = await query

      if (error) {
        console.error('Error fetching area KPI metrics:', error)
        return []
      }

      // Calculate metrics for each area
      return (areas || []).map(area => {
        const initiatives = area.initiatives || []
        const totalInitiatives = initiatives.length
        const completedInitiatives = initiatives.filter(i => i.status === 'completed').length
        const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length
        
        const completionRate = totalInitiatives > 0 
          ? Math.round((completedInitiatives / totalInitiatives) * 100)
          : 0

        const averageProgress = totalInitiatives > 0 
          ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / totalInitiatives)
          : 0

        const totalBudget = initiatives.reduce((sum, i) => sum + (i.budget || 0), 0)
        const totalActualCost = initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
        const budgetEfficiency = totalBudget > 0 
          ? Math.round(((totalBudget - totalActualCost) / totalBudget) * 100)
          : 100

        return {
          id: area.id,
          name: area.name,
          description: area.description,
          completion_rate: completionRate,
          average_progress: averageProgress,
          budget_efficiency: budgetEfficiency,
          total_initiatives: totalInitiatives,
          active_initiatives: inProgressInitiatives,
          completed_initiatives: completedInitiatives,
          budget_variance: totalBudget > 0 ? Math.abs(((totalActualCost - totalBudget) / totalBudget) * 100) : 0,
          resource_utilization: 80 + Math.random() * 20 // Simplified
        }
      })

    } catch (error) {
      console.error('Error getting area KPI metrics:', error)
      return []
    }
  }

  private async getClientStrategicMetrics(tenantId: string): Promise<any> {
    try {
      // Get strategic initiatives (assuming they have a flag or can be identified)
      const { data: initiatives, error } = await this.supabase
        .from('initiatives')
        .select('id, status, progress, priority, budget, actual_cost')
        
        .in('priority', ['high', 'critical']) // Assuming strategic initiatives have high priority

      if (error) {
        console.error('Error fetching strategic metrics:', error)
        return null
      }

      const totalStrategic = initiatives?.length || 0
      const completedStrategic = initiatives?.filter(i => i.status === 'completed').length || 0
      const averageStrategicProgress = totalStrategic > 0 
        ? Math.round(initiatives!.reduce((sum, i) => sum + (i.progress || 0), 0) / totalStrategic)
        : 0

      return {
        total_strategic_initiatives: totalStrategic,
        completed_strategic: completedStrategic,
        strategic_completion_rate: totalStrategic > 0 ? Math.round((completedStrategic / totalStrategic) * 100) : 0,
        strategic_progress: averageStrategicProgress,
        alignment_score: Math.max(60, averageStrategicProgress), // Simplified calculation
        strategic_budget_allocation: initiatives?.reduce((sum, i) => sum + (i.budget || 0), 0) || 0
      }

    } catch (error) {
      console.error('Error getting strategic metrics:', error)
      return null
    }
  }
}

// Export singleton instance
export const stratixKPIDataService = new StratixKPIDataService()