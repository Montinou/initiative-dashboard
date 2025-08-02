import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stratixAPI, StratixAPIClient } from '../api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id' }
          }
        }
      })
    }
  })
}))

describe('StratixAPIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock environment variables
    vi.stubEnv('NEXT_PUBLIC_STRATIX_API_URL', 'https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative')
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with correct base URL', () => {
      expect(stratixAPI).toBeDefined()
      expect(stratixAPI['baseUrl']).toBe('https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative')
    })

    it('should detect Cloud Run availability correctly', () => {
      expect(stratixAPI['isCloudRunAvailable']()).toBe(true)
    })
  })

  describe('Authentication', () => {
    it('should get auth token from Supabase', async () => {
      const token = await stratixAPI['getAuthToken']()
      expect(token).toBe('test-token')
    })
  })

  describe('Cache Management', () => {
    it('should cache and retrieve data correctly', () => {
      const testData = { kpis: [{ name: 'Test KPI', value: '100%' }] }
      const cacheKey = 'test-key'
      
      stratixAPI['setCache'](cacheKey, testData)
      const cachedData = stratixAPI['getFromCache'](cacheKey)
      
      expect(cachedData).toEqual(testData)
    })

    it('should expire cached data after timeout', () => {
      const testData = { kpis: [] }
      const cacheKey = 'test-key-expire'
      
      // Mock the cache timeout to be 0 for immediate expiration
      stratixAPI['cacheTimeout'] = 0
      
      stratixAPI['setCache'](cacheKey, testData)
      
      // Wait a bit and check if cache expired
      setTimeout(() => {
        const cachedData = stratixAPI['getFromCache'](cacheKey)
        expect(cachedData).toBeNull()
      }, 1)
    })
  })

  describe('AI Analysis', () => {
    it('should analyze user data successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                kpis: [
                  {
                    name: 'Completion Rate',
                    value: '85%',
                    trend: 'up',
                    trendValue: 5,
                    category: 'performance',
                    priority: 'high'
                  }
                ],
                insights: [],
                actionPlans: []
              })
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.analyzeUserData('test-user-id')
      
      expect(result.success).toBe(true)
      expect(result.data?.kpis).toBeDefined()
      expect(result.data?.kpis?.[0].name).toBe('Completion Rate')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await stratixAPI.analyzeUserData('test-user-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle invalid JSON responses', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Invalid JSON response'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.analyzeUserData('test-user-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('AI response format error')
    })
  })

  describe('KPI Generation', () => {
    it('should generate KPIs successfully', async () => {
      const mockKPIs = [
        {
          name: 'Budget Efficiency',
          value: '92%',
          trend: 'up',
          trendValue: 3,
          category: 'financial',
          priority: 'medium'
        }
      ]

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify(mockKPIs)
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.generateKPIs('test-user-id')
      
      expect(result.success).toBe(true)
      expect(result.data?.kpis).toEqual(mockKPIs)
    })

    it('should apply filters when provided', async () => {
      const filters = { area: 'finance', priority: 'high' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: { parts: [{ text: JSON.stringify([]) }] }
          }]
        })
      })

      await stratixAPI.generateKPIs('test-user-id', filters)
      
      // Verify that the request was made with filters in the prompt
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
      expect(lastCall[1].body).toContain(JSON.stringify(filters))
    })
  })

  describe('Chat Functionality', () => {
    it('should handle chat messages successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'Hola! Te puedo ayudar con el análisis de tus KPIs.'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.chat('test-user-id', '¿Cómo están mis KPIs?')
      
      expect(result.success).toBe(true)
      expect(result.data?.message).toContain('análisis de tus KPIs')
    })

    it('should include conversation history in context', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'Response with context' }] } }]
        })
      })

      await stratixAPI.chat('test-user-id', 'New question', conversationHistory)
      
      // Verify that the request includes conversation history
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Previous question')
        })
      )
    })
  })

  describe('Streaming Chat', () => {
    it('should stream chat responses', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: 'This is a streaming response that will be chunked'
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const chunks: string[] = []
      const streamGenerator = stratixAPI.streamChat('test-user-id', 'Test message')

      for await (const chunk of streamGenerator) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toContain('streaming response')
    })

    it('should handle streaming errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Stream error'))

      const chunks: string[] = []
      const streamGenerator = stratixAPI.streamChat('test-user-id', 'Test message')

      for await (const chunk of streamGenerator) {
        chunks.push(chunk)
      }

      expect(chunks.join('')).toContain('problema al conectar')
    })
  })

  describe('Insights Generation', () => {
    it('should generate insights successfully', async () => {
      const mockInsights = [
        {
          id: 'insight-1',
          title: 'High Performance Area',
          description: 'Finance area is performing exceptionally well',
          impact: 'high',
          type: 'opportunity',
          metrics: ['95% completion rate'],
          affectedAreas: ['Finance'],
          suggestedActions: ['Replicate best practices']
        }
      ]

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify(mockInsights)
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.getInsights('test-user-id')
      
      expect(result.success).toBe(true)
      expect(result.data?.insights).toEqual(mockInsights)
    })
  })

  describe('Action Plan Creation', () => {
    it('should create action plans successfully', async () => {
      const mockActionPlans = [
        {
          id: 'plan-1',
          title: 'Improve Budget Efficiency',
          description: 'Strategic plan to optimize budget allocation',
          steps: [
            {
              id: 'step-1',
              title: 'Analyze current spending',
              description: 'Review all current expenditures',
              order: 1,
              duration: '1 week'
            }
          ],
          timeline: '3 months',
          priority: 'high',
          expectedImpact: 'Reduce costs by 15%'
        }
      ]

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify(mockActionPlans)
            }]
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await stratixAPI.createActionPlan('test-user-id', 'Optimize budget')
      
      expect(result.success).toBe(true)
      expect(result.data?.actionPlans).toEqual(mockActionPlans)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should retry failed requests', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'Success' }] } }] })
        })

      const result = await stratixAPI.chat('test-user-id', 'Test message')
      
      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should not retry client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const result = await stratixAPI.chat('test-user-id', 'Test message')
      
      expect(result.success).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle authentication failures', async () => {
      // Create a spy on the getAuthToken method
      const getAuthTokenSpy = vi.spyOn(stratixAPI as any, 'getAuthToken')
      getAuthTokenSpy.mockResolvedValueOnce(null)

      const result = await stratixAPI.analyzeUserData('test-user-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('No authentication token')
      
      getAuthTokenSpy.mockRestore()
    })
  })

  describe('Text Extraction Utility', () => {
    it('should extract text from nested response objects', () => {
      const complexResponse = {
        data: {
          result: {
            content: {
              text: 'Found text content'
            }
          }
        }
      }

      const extractedText = stratixAPI['extractTextFromResponse'](complexResponse)
      expect(extractedText).toBe('Found text content')
    })

    it('should return null for objects without text content', () => {
      const responseWithoutText = {
        numbers: [1, 2, 3],
        booleans: { isValid: true }
      }

      const extractedText = stratixAPI['extractTextFromResponse'](responseWithoutText)
      expect(extractedText).toBeNull()
    })

    it('should handle string responses directly', () => {
      const stringResponse = 'Direct string response'
      const extractedText = stratixAPI['extractTextFromResponse'](stringResponse)
      expect(extractedText).toBe('Direct string response')
    })
  })

  describe('Cloud Run Service Detection', () => {
    it('should detect Cloud Run availability correctly with current URL', () => {
      expect(stratixAPI['isCloudRunAvailable']()).toBe(true)
    })
  })
})