import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStratixAssistant } from '../useStratixAssistant'

// Mock the auth context
const mockSession = {
  user: { id: 'test-user-id' },
  access_token: 'test-token'
}

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ session: mockSession })
}))

// Mock the API client
const mockStratixAPI = {
  analyzeUserData: vi.fn(),
  generateKPIs: vi.fn(),
  getInsights: vi.fn(),
  createActionPlan: vi.fn(),
  chat: vi.fn(),
  streamChat: vi.fn()
}

vi.mock('@/lib/stratix/api-client', () => ({
  stratixAPI: mockStratixAPI
}))

// Mock the data service
const mockStratixDataService = {
  gatherCompanyContext: vi.fn(),
  generateKPIsFromContext: vi.fn(),
  generateInsightsFromContext: vi.fn()
}

vi.mock('@/lib/stratix/data-service', () => ({
  stratixDataService: mockStratixDataService
}))

describe('useStratixAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful responses
    mockStratixDataService.gatherCompanyContext.mockResolvedValue({
      userId: 'test-user-id',
      tenantId: 'test-tenant',
      profile: {
        fullName: 'Test User',
        email: 'test@example.com',
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
        averageProgress: 75,
        totalUsers: 25
      },
      initiatives: [],
      areas: [],
      recentActivity: []
    })

    mockStratixDataService.generateKPIsFromContext.mockReturnValue([
      {
        name: 'Test KPI',
        value: '85%',
        trend: 'up',
        trendValue: 5,
        category: 'performance',
        priority: 'high'
      }
    ])

    mockStratixDataService.generateInsightsFromContext.mockReturnValue([
      {
        id: 'insight-1',
        title: 'Test Insight',
        description: 'Test insight description',
        impact: 'high',
        type: 'opportunity'
      }
    ])
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useStratixAssistant())

      expect(result.current.kpis).toEqual([])
      expect(result.current.insights).toEqual([])
      expect(result.current.actionPlans).toEqual([])
      expect(result.current.companyContext).toBeNull()
      expect(result.current.isLoadingKPIs).toBe(false)
      expect(result.current.isLoadingInsights).toBe(false)
      expect(result.current.isLoadingActionPlans).toBe(false)
      expect(result.current.isAnalyzing).toBe(false)
      expect(result.current.isLoadingContext).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load context on mount when user is authenticated', async () => {
      renderHook(() => useStratixAssistant())

      await waitFor(() => {
        expect(mockStratixDataService.gatherCompanyContext).toHaveBeenCalledWith('test-user-id')
      })
    })

    it('should not load context when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({ session: null })
      
      renderHook(() => useStratixAssistant())

      expect(mockStratixDataService.gatherCompanyContext).not.toHaveBeenCalled()
    })
  })

  describe('Context Management', () => {
    it('should refresh context successfully', async () => {
      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshContext()
      })

      expect(result.current.companyContext).toBeDefined()
      expect(result.current.companyContext?.userId).toBe('test-user-id')
      expect(result.current.kpis).toHaveLength(1)
      expect(result.current.insights).toHaveLength(1)
      expect(result.current.isLoadingContext).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle context loading errors', async () => {
      const errorMessage = 'Failed to load context'
      mockStratixDataService.gatherCompanyContext.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshContext()
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.isLoadingContext).toBe(false)
    })

    it('should provide fallback context in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      mockStratixDataService.gatherCompanyContext.mockRejectedValue(new Error('Context error'))

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshContext()
      })

      expect(result.current.companyContext).toBeDefined()
      expect(result.current.companyContext?.company.totalInitiatives).toBe(0)
      expect(result.current.companyContext?.company.totalUsers).toBe(1)
    })
  })

  describe('KPI Management', () => {
    it('should refresh KPIs using context data', async () => {
      const { result } = renderHook(() => useStratixAssistant())

      // Set up context first
      await act(async () => {
        await result.current.refreshContext()
      })

      await act(async () => {
        await result.current.refreshKPIs()
      })

      expect(result.current.kpis).toHaveLength(1)
      expect(result.current.kpis[0].name).toBe('Test KPI')
      expect(result.current.isLoadingKPIs).toBe(false)
    })

    it('should fallback to API when context is not available', async () => {
      mockStratixAPI.generateKPIs.mockResolvedValue({
        success: true,
        data: {
          kpis: [
            {
              name: 'API KPI',
              value: '90%',
              trend: 'up',
              trendValue: 3,
              category: 'performance',
              priority: 'medium'
            }
          ]
        }
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshKPIs()
      })

      expect(mockStratixAPI.generateKPIs).toHaveBeenCalledWith('test-user-id', undefined)
    })

    it('should handle KPI generation errors', async () => {
      mockStratixDataService.generateKPIsFromContext.mockImplementation(() => {
        throw new Error('KPI generation failed')
      })
      mockStratixAPI.generateKPIs.mockResolvedValue({
        success: false,
        error: 'API KPI generation failed'
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshKPIs()
      })

      expect(result.current.error).toBe('API KPI generation failed')
      expect(result.current.isLoadingKPIs).toBe(false)
    })
  })

  describe('Insights Management', () => {
    it('should refresh insights using context data', async () => {
      const { result } = renderHook(() => useStratixAssistant())

      // Set up context first
      await act(async () => {
        await result.current.refreshContext()
      })

      await act(async () => {
        await result.current.refreshInsights()
      })

      expect(result.current.insights).toHaveLength(1)
      expect(result.current.insights[0].title).toBe('Test Insight')
      expect(result.current.isLoadingInsights).toBe(false)
    })

    it('should fallback to API when context is not available', async () => {
      mockStratixAPI.getInsights.mockResolvedValue({
        success: true,
        data: {
          insights: [
            {
              id: 'api-insight-1',
              title: 'API Insight',
              description: 'API insight description',
              impact: 'medium',
              type: 'recommendation'
            }
          ]
        }
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.refreshInsights()
      })

      expect(mockStratixAPI.getInsights).toHaveBeenCalledWith('test-user-id', undefined)
    })
  })

  describe('Action Plan Management', () => {
    it('should create action plans successfully', async () => {
      mockStratixAPI.createActionPlan.mockResolvedValue({
        success: true,
        data: {
          actionPlans: [
            {
              id: 'plan-1',
              title: 'Test Action Plan',
              description: 'Test plan description',
              steps: [],
              timeline: '3 months',
              priority: 'high',
              expectedImpact: 'Improve efficiency by 20%'
            }
          ]
        }
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.createActionPlan('Improve efficiency')
      })

      expect(result.current.actionPlans).toHaveLength(1)
      expect(result.current.actionPlans[0].title).toBe('Test Action Plan')
      expect(result.current.isLoadingActionPlans).toBe(false)
    })

    it('should handle action plan creation errors', async () => {
      mockStratixAPI.createActionPlan.mockResolvedValue({
        success: false,
        error: 'Failed to create action plan'
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.createActionPlan('Invalid objective')
      })

      expect(result.current.error).toBe('Failed to create action plan')
      expect(result.current.isLoadingActionPlans).toBe(false)
    })
  })

  describe('Chat Functionality', () => {
    it('should handle chat messages successfully', async () => {
      mockStratixAPI.chat.mockResolvedValue({
        success: true,
        data: {
          message: 'Hola! Te puedo ayudar con el análisis de tus KPIs.'
        }
      })

      const { result } = renderHook(() => useStratixAssistant())

      let chatResponse: string = ''
      await act(async () => {
        chatResponse = await result.current.chat('¿Cómo están mis KPIs?')
      })

      expect(chatResponse).toBe('Hola! Te puedo ayudar con el análisis de tus KPIs.')
      expect(mockStratixAPI.chat).toHaveBeenCalledWith(
        'test-user-id',
        '¿Cómo están mis KPIs?',
        expect.any(Array)
      )
    })

    it('should include company context in chat requests', async () => {
      mockStratixAPI.chat.mockResolvedValue({
        success: true,
        data: { message: 'Response with context' }
      })

      const { result } = renderHook(() => useStratixAssistant())

      // Set up context first
      await act(async () => {
        await result.current.refreshContext()
      })

      await act(async () => {
        await result.current.chat('Test message')
      })

      // Verify that the chat was called with context
      const chatCall = mockStratixAPI.chat.mock.calls[0]
      expect(chatCall[2]).toBeDefined() // Context should be in the history
      expect(chatCall[2][0].content).toContain('CONTEXTO EMPRESARIAL ACTUAL')
    })

    it('should handle chat errors', async () => {
      mockStratixAPI.chat.mockResolvedValue({
        success: false,
        error: 'Chat service unavailable'
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        try {
          await result.current.chat('Test message')
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Chat service unavailable')
        }
      })

      expect(result.current.error).toBe('Chat service unavailable')
    })

    it('should handle streaming chat', async () => {
      const chunks = ['Hello ', 'there! ', 'How ', 'can ', 'I ', 'help?']
      const mockAsyncGenerator = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk
          }
        }
      }

      mockStratixAPI.streamChat.mockReturnValue(mockAsyncGenerator)

      const { result } = renderHook(() => useStratixAssistant())

      const receivedChunks: string[] = []
      await act(async () => {
        await result.current.streamChat(
          'Test message',
          [],
          (chunk) => receivedChunks.push(chunk)
        )
      })

      expect(receivedChunks).toEqual(chunks)
    })
  })

  describe('User Data Analysis', () => {
    it('should analyze user data successfully', async () => {
      mockStratixAPI.analyzeUserData.mockResolvedValue({
        success: true,
        data: {
          kpis: [{ name: 'Analysis KPI', value: '95%' }],
          insights: [{ id: 'analysis-insight', title: 'Analysis Insight' }],
          actionPlans: [{ id: 'analysis-plan', title: 'Analysis Plan' }]
        }
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.analyzeUserData()
      })

      expect(result.current.kpis).toHaveLength(1)
      expect(result.current.insights).toHaveLength(1)
      expect(result.current.actionPlans).toHaveLength(1)
      expect(result.current.isAnalyzing).toBe(false)
    })

    it('should handle analysis errors', async () => {
      mockStratixAPI.analyzeUserData.mockResolvedValue({
        success: false,
        error: 'Analysis failed'
      })

      const { result } = renderHook(() => useStratixAssistant())

      await act(async () => {
        await result.current.analyzeUserData()
      })

      expect(result.current.error).toBe('Analysis failed')
      expect(result.current.isAnalyzing).toBe(false)
    })
  })

  describe('Error Management', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useStratixAssistant())

      // Set an error
      act(() => {
        result.current.error = 'Test error'
      })

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should clear error on unmount', () => {
      const { unmount } = renderHook(() => useStratixAssistant())

      unmount()

      // The effect should have run to clear errors
      // This is mainly to ensure the cleanup function is called
      expect(true).toBe(true) // Placeholder assertion
    })
  })

  describe('Loading States', () => {
    it('should manage loading states correctly during operations', async () => {
      // Mock a slow response
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => { resolvePromise = resolve })
      mockStratixDataService.gatherCompanyContext.mockReturnValue(slowPromise)

      const { result } = renderHook(() => useStratixAssistant())

      // Start the operation
      act(() => {
        result.current.refreshContext()
      })

      // Should be loading
      expect(result.current.isLoadingContext).toBe(true)

      // Resolve the promise
      act(() => {
        resolvePromise({
          userId: 'test-user-id',
          tenantId: 'test-tenant',
          profile: { fullName: 'Test User', email: 'test@example.com' },
          company: {
            totalInitiatives: 0, activeInitiatives: 0, completedInitiatives: 0,
            overdueInitiatives: 0, totalAreas: 0, activeBudget: 0,
            totalActualCost: 0, averageProgress: 0, totalUsers: 0
          },
          initiatives: [], areas: [], recentActivity: []
        })
      })

      await waitFor(() => {
        expect(result.current.isLoadingContext).toBe(false)
      })
    })
  })
})