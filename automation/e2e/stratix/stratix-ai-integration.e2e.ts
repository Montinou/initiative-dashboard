/**
 * Stratix AI Integration E2E Tests
 * 
 * Comprehensive end-to-end testing for Stratix AI assistant functionality
 * including chat interface, AI responses, streaming, and business intelligence features.
 */

import { test, expect } from '@playwright/test'
import { StratixAssistantPage } from '../../utils/page-objects/stratix-assistant.page'

test.describe('Stratix AI Integration E2E Tests', () => {
  let stratixPage: StratixAssistantPage

  test.beforeEach(async ({ page }) => {
    stratixPage = new StratixAssistantPage(page)
    await stratixPage.navigateToStratix()
  })

  test.describe('Chat Interface Loading', () => {
    test('should load Stratix assistant interface when enabled', async ({ page }) => {
      // Skip if Stratix is not enabled
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Verify chat interface is loaded
      expect(await stratixPage.isChatInterfaceLoaded()).toBe(true)

      // Check essential UI elements
      await expect(page.locator('[data-testid="stratix-chat-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="messages-container"]')).toBeVisible()
    })

    test('should show connection status indicator', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Check connection status
      expect(await stratixPage.getConnectionStatus()).toBeTruthy()
      
      // Should indicate online status
      expect(await stratixPage.isConnectionOnline()).toBe(true)
    })

    test('should display company context indicator', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Should show that company context is loaded
      expect(await stratixPage.hasCompanyContext()).toBe(true)
    })
  })

  test.describe('Basic Chat Functionality', () => {
    test('should send and receive messages', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock AI response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Hello! I can help you analyze your business data and provide strategic insights.',
              insights: [],
              recommendations: []
            }
          })
        })
      })

      const testMessage = 'Hello, Stratix!'
      const response = await stratixPage.sendMessageAndWaitForResponse(testMessage)

      // Verify message was sent and response received
      expect(await stratixPage.getLatestUserMessage()).toContain(testMessage)
      expect(response).toContain('Hello! I can help you')
      
      // Verify message count increased
      expect(await stratixPage.getMessageCount()).toBe(2) // User + AI message
    })

    test('should show typing indicator during AI processing', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock delayed response
      let resolveResponse: (value: any) => void
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve
      })

      await page.route('**/api/stratix/**', async route => {
        const response = await responsePromise
        await route.fulfill(response)
      })

      // Send message
      await stratixPage.sendMessage('What are our KPIs?')

      // Should show typing indicator
      await stratixPage.waitForTypingIndicator()
      expect(await stratixPage.isTypingIndicatorVisible()).toBe(true)

      // Complete the response
      resolveResponse!({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            response: 'Here are your current KPIs based on the latest data...',
            insights: ['Marketing performance is up 15%'],
            recommendations: ['Focus on lead conversion optimization']
          }
        })
      })

      // Wait for processing to complete
      await stratixPage.waitForAiProcessingComplete()

      // Typing indicator should be hidden
      expect(await stratixPage.isTypingIndicatorVisible()).toBe(false)
    })

    test('should handle streaming responses', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock streaming response
      await page.route('**/api/stratix/**', async route => {
        // Simulate streaming by sending chunks
        const response = new Response(
          new ReadableStream({
            start(controller) {
              const chunks = [
                'Based on your data, ',
                'I can see that your ',
                'marketing initiatives are performing well.'
              ]
              
              chunks.forEach((chunk, index) => {
                setTimeout(() => {
                  controller.enqueue(new TextEncoder().encode(chunk))
                  if (index === chunks.length - 1) {
                    controller.close()
                  }
                }, index * 500)
              })
            }
          }),
          {
            headers: { 'Content-Type': 'text/plain' }
          }
        )
        
        await route.fulfill({ response })
      })

      await stratixPage.sendMessage('Analyze our marketing performance')

      // Wait for streaming to complete
      await stratixPage.waitForStreamingResponse()

      const response = await stratixPage.getLatestAiMessage()
      expect(response).toContain('marketing initiatives are performing well')
    })
  })

  test.describe('Business Intelligence Queries', () => {
    test('should handle KPI analysis queries', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock KPI analysis response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Here are your top performing KPIs this quarter: Revenue Growth: 25%, Customer Acquisition: 40 new customers, Initiative Completion Rate: 78%',
              insights: [
                'Revenue growth is exceeding targets by 10%',
                'Customer acquisition is ahead of schedule',
                'Initiative completion rate needs improvement'
              ],
              kpis: [
                { name: 'Revenue Growth', value: '25%', trend: 'up' },
                { name: 'Customer Acquisition', value: '40', trend: 'up' },
                { name: 'Initiative Completion', value: '78%', trend: 'stable' }
              ]
            }
          })
        })
      })

      const response = await stratixPage.testBusinessAnalyticsQuery()

      // Verify KPI data in response
      expect(response).toContain('Revenue Growth: 25%')
      expect(response).toContain('Customer Acquisition: 40')
      
      // Check if KPI section is displayed
      expect(await stratixPage.hasKpiSection()).toBe(true)
      
      const kpiData = await stratixPage.getKpiData()
      expect(kpiData).toHaveLength(3)
      expect(kpiData[0].name).toBe('Revenue Growth')
      expect(kpiData[0].value).toBe('25%')
      expect(kpiData[0].trend).toBe('up')
    })

    test('should handle strategic planning queries', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock strategic planning response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Based on your current marketing data, here\'s an action plan to improve performance...',
              insights: [
                'Marketing conversion rate is below industry average',
                'Social media engagement shows positive trends',
                'Email campaigns need optimization'
              ],
              recommendations: [
                'Increase social media budget by 20%',
                'A/B test email subject lines',
                'Implement retargeting campaigns',
                'Focus on high-converting content types'
              ]
            }
          })
        })
      })

      const response = await stratixPage.testStrategicPlanningQuery()

      // Verify strategic insights
      expect(response).toContain('action plan to improve')
      
      // Check recommendations section
      expect(await stratixPage.hasRecommendations()).toBe(true)
      
      const recommendations = await stratixPage.getRecommendations()
      expect(recommendations).toHaveLength(4)
      expect(recommendations[0]).toContain('social media budget')
    })

    test('should handle data exploration queries', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock comparative analysis response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Comparing Q3 vs Q2 performance: Revenue increased by 15%, initiatives completion improved by 8%, customer satisfaction up 12%',
              insights: [
                'Q3 shows consistent improvement across all metrics',
                'Initiative completion rate trending upward',
                'Customer satisfaction at all-time high'
              ],
              visualizations: {
                charts: ['revenue-comparison', 'completion-trends'],
                tables: ['quarterly-metrics']
              }
            }
          })
        })
      })

      const response = await stratixPage.testDataExplorationQuery()

      // Verify comparative analysis
      expect(response).toContain('Revenue increased by 15%')
      expect(response).toContain('initiatives completion improved')
      
      // Check for data visualizations
      expect(await stratixPage.hasDataVisualization()).toBe(true)
    })

    test('should handle operational insights queries', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock operational insights response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Areas requiring immediate attention: Sales pipeline optimization (3 overdue initiatives), Marketing campaign performance (conversion rate below 2%), Operations efficiency (bottleneck in approval process)',
              insights: [
                'Sales team has capacity for 2 additional initiatives',
                'Marketing budget utilization at 85%',
                'Operations approval process taking 40% longer than target'
              ],
              urgentActions: [
                'Review overdue sales initiatives',
                'Optimize marketing conversion funnel',
                'Streamline approval workflow'
              ]
            }
          })
        })
      })

      const response = await stratixPage.testOperationalInsightsQuery()

      // Verify operational analysis
      expect(response).toContain('Areas requiring immediate attention')
      expect(response).toContain('Sales pipeline optimization')
      expect(response).toContain('Operations efficiency')
    })
  })

  test.describe('Advanced Features', () => {
    test('should display contextual insights', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock response with insights
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Your company shows strong performance across key areas.',
              insights: [
                'Marketing initiatives are 15% ahead of schedule',
                'Sales conversion rate improved by 8% this month',
                'Customer satisfaction scores increased to 4.2/5'
              ]
            }
          })
        })
      })

      await stratixPage.sendMessageAndWaitForResponse('Give me company insights')

      // Verify insights section
      expect(await stratixPage.hasInsights()).toBe(true)
      
      const insights = await stratixPage.getInsights()
      expect(insights).toHaveLength(3)
      expect(insights[0]).toContain('Marketing initiatives')
      expect(insights[1]).toContain('Sales conversion rate')
    })

    test('should support message actions (copy, feedback)', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'This is a test response for message actions.',
              insights: []
            }
          })
        })
      })

      await stratixPage.sendMessageAndWaitForResponse('Test message actions')

      // Test copy functionality
      await stratixPage.copyMessage(0) // Copy first AI message

      // Test feedback functionality
      await stratixPage.provideFeedback(0, true) // Positive feedback
      
      // Verify feedback was registered (UI should show feedback state)
      await expect(page.locator('[data-feedback="positive"]')).toBeVisible()
    })

    test('should export conversation and insights', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock conversation
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'This conversation will be exported.',
              insights: ['Key insight for export']
            }
          })
        })
      })

      await stratixPage.sendMessageAndWaitForResponse('Generate exportable insights')

      // Test export functionality
      const downloadPromise = page.waitForEvent('download')
      await stratixPage.exportInsights()
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('stratix-insights')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock API error
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'AI service temporarily unavailable'
          })
        })
      })

      await stratixPage.sendMessage('This should trigger an error')

      // Should show error message
      expect(await stratixPage.hasErrorMessage()).toBe(true)
      
      const errorMessage = await stratixPage.getErrorMessage()
      expect(errorMessage).toContain('AI service temporarily unavailable')

      // Should show retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle network timeout', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock network timeout
      await page.route('**/api/stratix/**', async route => {
        // Delay response beyond timeout
        await new Promise(resolve => setTimeout(resolve, 35000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { response: 'Late response' } })
        })
      })

      await stratixPage.sendMessage('This will timeout')

      // Should show timeout error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 40000 })
      
      const errorMessage = await stratixPage.getErrorMessage()
      expect(errorMessage).toContain('timeout' || 'unavailable')
    })

    test('should recover from errors with retry', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Test error recovery functionality
      const recovered = await stratixPage.testErrorRecovery()
      expect(recovered).toBe(true)
    })
  })

  test.describe('Real-time Features', () => {
    test('should handle real-time message updates', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Test real-time updates
      const updatesWorking = await stratixPage.verifyRealTimeUpdates()
      expect(updatesWorking).toBe(true)
    })

    test('should maintain chat history across sessions', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock conversation
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'This message should persist.',
              insights: []
            }
          })
        })
      })

      await stratixPage.sendMessageAndWaitForResponse('Persistent message')
      const initialCount = await stratixPage.getMessageCount()

      // Reload page
      await page.reload()
      await stratixPage.waitForPageLoad()

      // Check if chat history is restored
      const afterReloadCount = await stratixPage.getMessageCount()
      expect(afterReloadCount).toBeGreaterThanOrEqual(initialCount)
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should respond within acceptable time limits', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock fast response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Quick response for performance test',
              insights: []
            }
          })
        })
      })

      const startTime = Date.now()
      await stratixPage.sendMessageAndWaitForResponse('Performance test message')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    })

    test('should handle concurrent messages appropriately', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Mock responses for concurrent messages
      let messageCount = 0
      await page.route('**/api/stratix/**', async route => {
        messageCount++
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: `Response to message ${messageCount}`,
              insights: []
            }
          })
        })
      })

      // Send multiple messages quickly
      const promises = [
        stratixPage.sendMessage('Message 1'),
        stratixPage.sendMessage('Message 2'),
        stratixPage.sendMessage('Message 3')
      ]

      await Promise.all(promises)

      // Wait for all responses
      await stratixPage.waitForAiProcessingComplete()

      // Should have handled all messages
      const finalCount = await stratixPage.getMessageCount()
      expect(finalCount).toBeGreaterThanOrEqual(6) // 3 user + 3 AI messages
    })

    test('should work on mobile devices', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Should still load and function
      expect(await stratixPage.isChatInterfaceLoaded()).toBe(true)

      // Touch interactions should work
      await page.tap('[data-testid="chat-input"]')
      
      // Mock mobile response
      await page.route('**/api/stratix/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              response: 'Mobile response test',
              insights: []
            }
          })
        })
      })

      // Should work with touch input
      await page.fill('[data-testid="chat-input"]', 'Mobile test message')
      await page.tap('[data-testid="send-button"]')

      await stratixPage.waitForAiProcessingComplete()
      expect(await stratixPage.getLatestAiMessage()).toContain('Mobile response test')
    })
  })

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Tab to chat input
      await page.keyboard.press('Tab')
      
      // Should focus on chat input
      await expect(page.locator('[data-testid="chat-input"]')).toBeFocused()

      // Type message
      await page.keyboard.type('Keyboard navigation test')

      // Tab to send button and activate
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="send-button"]')).toBeFocused()
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Check for accessibility attributes
      await expect(page.locator('[data-testid="chat-input"]')).toHaveAttribute('role', 'textbox')
      await expect(page.locator('[data-testid="messages-container"]')).toHaveAttribute('role', 'log')
      
      // Check for ARIA labels
      await expect(page.locator('[aria-label]')).toHaveCount({ min: 3 })
    })

    test('should provide screen reader announcements', async ({ page }) => {
      test.skip(!await stratixPage.isStratixEnabled(), 'Stratix is not enabled')

      // Check for live regions for screen readers
      await expect(page.locator('[aria-live]')).toHaveCount({ min: 1 })
      await expect(page.locator('[role="status"]')).toHaveCount({ min: 0 })
    })
  })
})