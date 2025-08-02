import { describe, it, expect, vi, beforeEach } from 'vitest'
import { stratixDataService } from '../data-service'
import type { CompanyContext } from '../data-service'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  })
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

describe('StratixDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('gatherCompanyContext', () => {
    it('should gather comprehensive company context successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-456',
        full_name: 'John Doe',
        email: 'john@example.com',
        role: 'Manager',
        areas: {
          id: 'area-1',
          name: 'Finance',
          description: 'Financial management'
        }
      }

      const mockInitiatives = [
        {
          id: 'init-1',
          tenant_id: 'tenant-456',
          area_id: 'area-1',
          title: 'Budget Optimization',
          description: 'Optimize budget allocation',
          status: 'in_progress',
          priority: 'high',
          initiative_progress: 75,
          budget: 100000,
          actual_cost: 80000,
          target_date: '2025-12-31',
          completion_date: null,
          created_at: '2025-01-01',
          updated_at: '2025-01-15',
          subtask_count: 5,
          completed_subtask_count: 4,
          subtask_completion_rate: 80
        },
        {
          id: 'init-2',
          tenant_id: 'tenant-456',
          area_id: 'area-1',
          title: 'Cost Reduction',
          description: 'Reduce operational costs',
          status: 'completed',
          priority: 'medium',
          initiative_progress: 100,
          budget: 50000,
          actual_cost: 45000,
          completion_date: '2025-01-10',
          created_at: '2024-12-01',
          updated_at: '2025-01-10',
          subtask_count: 3,
          completed_subtask_count: 3,
          subtask_completion_rate: 100
        }
      ]

      const mockAreas = [
        {
          id: 'area-1',
          name: 'Finance',
          description: 'Financial management',
          user_profiles: {
            full_name: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      ]

      // Mock Supabase responses
      mockSupabaseClient.from.mockImplementation((table) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
        }

        if (table === 'user_profiles') {
          chain.single.mockResolvedValue({ data: mockProfile, error: null })
        } else if (table === 'initiatives_with_subtasks_summary') {
          chain.order.mockResolvedValue({ data: mockInitiatives, error: null })
        } else if (table === 'areas') {
          chain.eq.mockReturnValue({
            ...chain,
            eq: vi.fn().mockResolvedValue({ data: mockAreas, error: null })
          })
        }

        return chain
      })

      // Mock user count
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockResolvedValue({ count: 25, error: null })
      })

      const context = await stratixDataService.gatherCompanyContext('user-123')

      expect(context).toBeDefined()
      expect(context.userId).toBe('user-123')
      expect(context.tenantId).toBe('tenant-456')
      expect(context.profile.fullName).toBe('John Doe')
      expect(context.company.totalInitiatives).toBe(2)
      expect(context.company.activeInitiatives).toBe(1)
      expect(context.company.completedInitiatives).toBe(1)
      expect(context.initiatives).toHaveLength(2)
      expect(context.areas).toHaveLength(1)
    })

    it('should handle missing user profile', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
          }
        }
        return mockSupabaseClient.from()
      })

      await expect(stratixDataService.gatherCompanyContext('invalid-user'))
        .rejects.toThrow('User profile not found')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database connection error' } 
            })
          }
        }
        return mockSupabaseClient.from()
      })

      await expect(stratixDataService.gatherCompanyContext('user-123'))
        .rejects.toThrow('User profile not found')
    })
  })

  describe('generateKPIsFromContext', () => {
    it('should generate accurate KPIs from company context', () => {
      const mockContext: CompanyContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        profile: {
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'Manager'
        },
        company: {
          totalInitiatives: 10,
          activeInitiatives: 6,
          completedInitiatives: 4,
          overdueInitiatives: 2,
          totalAreas: 3,
          activeBudget: 500000,
          totalActualCost: 420000,
          averageProgress: 72,
          totalUsers: 25
        },
        initiatives: [],
        areas: [
          {
            id: 'area-1',
            name: 'Finance',
            initiatives_count: 5,
            completion_rate: 80,
            average_progress: 85
          }
        ],
        recentActivity: []
      }

      const kpis = stratixDataService.generateKPIsFromContext(mockContext)

      expect(kpis).toHaveLength(6)
      
      // Test completion rate KPI
      const completionKPI = kpis.find(kpi => kpi.name === 'Tasa de Cumplimiento General')
      expect(completionKPI).toBeDefined()
      expect(completionKPI?.value).toBe('40%') // 4/10 = 40%
      expect(completionKPI?.priority).toBe('high') // < 70%

      // Test progress KPI
      const progressKPI = kpis.find(kpi => kpi.name === 'Progreso Promedio')
      expect(progressKPI).toBeDefined()
      expect(progressKPI?.value).toBe('72%')
      expect(progressKPI?.priority).toBe('medium') // >= 60%

      // Test risk KPI
      const riskKPI = kpis.find(kpi => kpi.name === 'Iniciativas en Riesgo')
      expect(riskKPI).toBeDefined()
      expect(riskKPI?.value).toBe(2)
      expect(riskKPI?.priority).toBe('medium') // <= 3

      // Test budget efficiency KPI
      const budgetKPI = kpis.find(kpi => kpi.name === 'Eficiencia Presupuestaria')
      expect(budgetKPI).toBeDefined()
      expect(budgetKPI?.value).toBe('16%') // (500000-420000)/500000 = 16%
      expect(budgetKPI?.priority).toBe('high') // < 70%
    })

    it('should handle edge cases with zero values', () => {
      const emptyContext: CompanyContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        profile: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        company: {
          totalInitiatives: 0,
          activeInitiatives: 0,
          completedInitiatives: 0,
          overdueInitiatives: 0,
          totalAreas: 0,
          activeBudget: 0,
          totalActualCost: 0,
          averageProgress: 0,
          totalUsers: 1
        },
        initiatives: [],
        areas: [],
        recentActivity: []
      }

      const kpis = stratixDataService.generateKPIsFromContext(emptyContext)

      expect(kpis).toHaveLength(6)
      
      const completionKPI = kpis.find(kpi => kpi.name === 'Tasa de Cumplimiento General')
      expect(completionKPI?.value).toBe('0%')

      const budgetKPI = kpis.find(kpi => kpi.name === 'Eficiencia Presupuestaria')
      expect(budgetKPI?.value).toBe('100%') // No budget means 100% efficiency
    })
  })

  describe('generateInsightsFromContext', () => {
    it('should generate relevant insights from company data', () => {
      const mockContext: CompanyContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        profile: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        company: {
          totalInitiatives: 10,
          activeInitiatives: 6,
          completedInitiatives: 4,
          overdueInitiatives: 4, // High number of overdue initiatives
          totalAreas: 3,
          activeBudget: 100000,
          totalActualCost: 95000, // High budget utilization
          averageProgress: 72,
          totalUsers: 25
        },
        initiatives: [
          {
            id: 'init-1',
            title: 'Manual Process Optimization',
            description: 'Manual process that needs automation',
            target_date: '2024-12-31', // Overdue
            status: 'in_progress',
            areas: { name: 'Operations' }
          } as any,
          {
            id: 'init-2',
            title: 'Another Manual Task',
            description: 'Another manual workflow',
            target_date: '2024-11-30', // Overdue
            status: 'in_progress',
            areas: { name: 'Finance' }
          } as any,
          {
            id: 'init-3',
            title: 'Third Manual Process',
            description: 'Yet another manual process',
            status: 'planning',
            areas: { name: 'HR' }
          } as any,
          {
            id: 'init-4',
            title: 'Fourth Manual Task',
            description: 'More manual work',
            status: 'planning',
            areas: { name: 'IT' }
          } as any
        ],
        areas: [
          {
            id: 'area-1',
            name: 'Finance',
            completion_rate: 85, // High performing area
            initiatives_count: 4,
            average_progress: 90
          },
          {
            id: 'area-2',
            name: 'Operations',
            completion_rate: 60,
            initiatives_count: 3,
            average_progress: 65
          }
        ],
        recentActivity: []
      }

      const insights = stratixDataService.generateInsightsFromContext(mockContext)

      expect(insights.length).toBeGreaterThan(0)

      // Should detect high-performing area
      const topAreaInsight = insights.find(insight => 
        insight.title.includes('Alto Rendimiento') && insight.title.includes('Finance')
      )
      expect(topAreaInsight).toBeDefined()
      expect(topAreaInsight?.type).toBe('opportunity')
      expect(topAreaInsight?.impact).toBe('high')

      // Should detect overdue initiatives risk
      const overdueRiskInsight = insights.find(insight => 
        insight.title.includes('Múltiples Iniciativas Retrasadas')
      )
      expect(overdueRiskInsight).toBeDefined()
      expect(overdueRiskInsight?.type).toBe('risk')
      expect(overdueRiskInsight?.impact).toBe('high')

      // Should detect high budget utilization
      const budgetInsight = insights.find(insight => 
        insight.title.includes('Alto Consumo Presupuestario')
      )
      expect(budgetInsight).toBeDefined()
      expect(budgetInsight?.type).toBe('risk')

      // Should detect automation opportunities
      const automationInsight = insights.find(insight => 
        insight.title.includes('Automatización de Procesos')
      )
      expect(automationInsight).toBeDefined()
      expect(automationInsight?.type).toBe('recommendation')
    })

    it('should not generate insights for good performance', () => {
      const goodContext: CompanyContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        profile: {
          fullName: 'John Doe',
          email: 'john@example.com'
        },
        company: {
          totalInitiatives: 10,
          activeInitiatives: 6,
          completedInitiatives: 4,
          overdueInitiatives: 0, // No overdue initiatives
          totalAreas: 3,
          activeBudget: 100000,
          totalActualCost: 50000, // Low budget utilization
          averageProgress: 85,
          totalUsers: 25
        },
        initiatives: [
          {
            id: 'init-1',
            title: 'Automated Process',
            description: 'Fully automated workflow',
            status: 'completed'
          } as any
        ],
        areas: [
          {
            id: 'area-1',
            name: 'Finance',
            completion_rate: 75, // Below high-performance threshold
            initiatives_count: 4,
            average_progress: 80
          }
        ],
        recentActivity: []
      }

      const insights = stratixDataService.generateInsightsFromContext(goodContext)

      // Should have fewer or no risk insights
      const riskInsights = insights.filter(insight => insight.type === 'risk')
      expect(riskInsights.length).toBeLessThanOrEqual(1)
    })
  })

  describe('generateRecentActivity', () => {
    it('should generate recent activity from initiatives', () => {
      const mockInitiatives = [
        {
          id: 'init-1',
          title: 'Budget Optimization',
          status: 'completed',
          completion_date: '2025-01-15',
          created_at: '2025-01-01',
          priority: 'high',
          initiative_progress: 100,
          areas: { name: 'Finance' }
        },
        {
          id: 'init-2',
          title: 'Process Improvement',
          status: 'in_progress',
          completion_date: null,
          created_at: '2025-01-10',
          priority: 'medium',
          initiative_progress: 75,
          areas: { name: 'Operations' }
        }
      ] as any[]

      const activity = stratixDataService['generateRecentActivity'](mockInitiatives)

      expect(activity.length).toBeGreaterThan(0)
      expect(activity.length).toBeLessThanOrEqual(5) // Max 5 activities

      // Should include completed initiative
      const completedActivity = activity.find(act => 
        act.type === 'initiative_completed' && act.title.includes('Budget Optimization')
      )
      expect(completedActivity).toBeDefined()

      // Should include created initiative
      const createdActivity = activity.find(act => 
        act.type === 'initiative_created' && act.title.includes('Process Improvement')
      )
      expect(createdActivity).toBeDefined()

      // Activities should be sorted by date (most recent first)
      for (let i = 0; i < activity.length - 1; i++) {
        const currentDate = new Date(activity[i].date)
        const nextDate = new Date(activity[i + 1].date)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    })

    it('should handle empty initiatives array', () => {
      const activity = stratixDataService['generateRecentActivity']([])
      expect(activity).toEqual([])
    })
  })

  describe('Area Statistics Calculation', () => {
    it('should calculate area statistics correctly', async () => {
      const mockProfile = {
        id: 'user-123',
        tenant_id: 'tenant-456',
        full_name: 'John Doe',
        email: 'john@example.com'
      }

      const mockInitiatives = [
        {
          id: 'init-1',
          area_id: 'area-1',
          status: 'completed',
          initiative_progress: 100
        },
        {
          id: 'init-2',
          area_id: 'area-1',
          status: 'in_progress',
          initiative_progress: 80
        },
        {
          id: 'init-3',
          area_id: 'area-1',
          status: 'in_progress',
          initiative_progress: 60
        }
      ]

      const mockAreas = [
        {
          id: 'area-1',
          name: 'Finance',
          description: 'Financial management'
        }
      ]

      // Mock the responses to test area statistics calculation
      mockSupabaseClient.from.mockImplementation((table) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
        }

        if (table === 'user_profiles') {
          chain.single.mockResolvedValue({ data: mockProfile, error: null })
        } else if (table === 'initiatives_with_subtasks_summary') {
          chain.order.mockResolvedValue({ data: mockInitiatives, error: null })
        } else if (table === 'areas') {
          chain.eq.mockReturnValue({
            ...chain,
            eq: vi.fn().mockResolvedValue({ data: mockAreas, error: null })
          })
        }

        return chain
      })

      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockResolvedValue({ count: 10, error: null })
      })

      const context = await stratixDataService.gatherCompanyContext('user-123')

      const financeArea = context.areas.find(area => area.name === 'Finance')
      expect(financeArea).toBeDefined()
      expect(financeArea?.initiatives_count).toBe(3)
      expect(financeArea?.completion_rate).toBe(33) // 1 completed out of 3 = 33%
      expect(financeArea?.active_initiatives).toBe(2) // 2 in_progress
      expect(financeArea?.average_progress).toBe(80) // (100+80+60)/3 = 80
    })
  })
})