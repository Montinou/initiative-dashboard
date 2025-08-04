/**
 * Stratix Assistant Page Object
 * 
 * Page object for Stratix AI assistant interactions including chat interface,
 * AI responses, insights generation, and real-time communication testing.
 */

import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class StratixAssistantPage extends BasePage {
  // Selectors
  private readonly chatContainer = '[data-testid="stratix-chat-container"]'
  private readonly chatInput = '[data-testid="chat-input"]'
  private readonly sendButton = '[data-testid="send-button"]'
  private readonly messagesContainer = '[data-testid="messages-container"]'
  private readonly userMessage = '[data-testid="user-message"]'
  private readonly aiMessage = '[data-testid="ai-message"]'
  private readonly typingIndicator = '[data-testid="typing-indicator"]'
  private readonly loadingSpinner = '[data-testid="loading-spinner"]'
  private readonly errorMessage = '[data-testid="error-message"]'
  private readonly retryButton = '[data-testid="retry-button"]'
  private readonly clearChatButton = '[data-testid="clear-chat"]'
  private readonly chatHistory = '[data-testid="chat-history"]'
  private readonly insightsSection = '[data-testid="insights-section"]'
  private readonly kpiSection = '[data-testid="kpi-section"]'
  private readonly recommendationsSection = '[data-testid="recommendations-section"]'
  private readonly exportButton = '[data-testid="export-insights"]'
  private readonly companyContextIndicator = '[data-testid="company-context"]'
  private readonly connectionStatus = '[data-testid="connection-status"]'
  private readonly messageTimestamp = '[data-testid="message-timestamp"]'
  private readonly messageActions = '[data-testid="message-actions"]'
  private readonly copyButton = '[data-testid="copy-message"]'
  private readonly feedbackButtons = '[data-testid="feedback-buttons"]'
  private readonly voiceInputButton = '[data-testid="voice-input"]'
  private readonly attachmentButton = '[data-testid="attachment-button"]'

  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to Stratix Assistant page
   */
  async navigateToStratix(): Promise<void> {
    await this.goto('/stratix-assistant')
    await this.waitForPageLoad()
  }

  /**
   * Check if chat interface is loaded
   */
  async isChatInterfaceLoaded(): Promise<boolean> {
    return await this.isElementVisible(this.chatContainer)
  }

  /**
   * Check if Stratix is enabled/available
   */
  async isStratixEnabled(): Promise<boolean> {
    try {
      await this.waitForElement(this.chatContainer, 5000)
      return true
    } catch {
      return false
    }
  }

  /**
   * Send message to AI assistant
   */
  async sendMessage(message: string): Promise<void> {
    await this.fillInput(this.chatInput, message)
    await this.clickElement(this.sendButton)
  }

  /**
   * Send message and wait for response
   */
  async sendMessageAndWaitForResponse(
    message: string, 
    timeout: number = 30000
  ): Promise<string> {
    const initialMessageCount = await this.getMessageCount()
    
    await this.sendMessage(message)
    
    // Wait for AI response (should be 2 new messages: user + AI)
    await this.page.waitForFunction(
      (count) => {
        const messages = document.querySelectorAll('[data-testid="ai-message"]')
        return messages.length > count
      },
      initialMessageCount,
      { timeout }
    )

    return await this.getLatestAiMessage()
  }

  /**
   * Get latest AI message content
   */
  async getLatestAiMessage(): Promise<string> {
    const aiMessages = await this.page.locator(this.aiMessage).all()
    if (aiMessages.length === 0) {
      throw new Error('No AI messages found')
    }
    
    const latestMessage = aiMessages[aiMessages.length - 1]
    return await latestMessage.textContent() || ''
  }

  /**
   * Get latest user message content
   */
  async getLatestUserMessage(): Promise<string> {
    const userMessages = await this.page.locator(this.userMessage).all()
    if (userMessages.length === 0) {
      throw new Error('No user messages found')
    }
    
    const latestMessage = userMessages[userMessages.length - 1]
    return await latestMessage.textContent() || ''
  }

  /**
   * Get total message count
   */
  async getMessageCount(): Promise<number> {
    const userMessages = await this.page.locator(this.userMessage).count()
    const aiMessages = await this.page.locator(this.aiMessage).count()
    return userMessages + aiMessages
  }

  /**
   * Check if typing indicator is visible
   */
  async isTypingIndicatorVisible(): Promise<boolean> {
    return await this.isElementVisible(this.typingIndicator)
  }

  /**
   * Wait for typing indicator to appear
   */
  async waitForTypingIndicator(): Promise<void> {
    await this.waitForElement(this.typingIndicator, 10000)
  }

  /**
   * Wait for typing indicator to disappear
   */
  async waitForTypingComplete(): Promise<void> {
    await this.waitForElementHidden(this.typingIndicator, 30000)
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoadingSpinnerVisible(): Promise<boolean> {
    return await this.isElementVisible(this.loadingSpinner)
  }

  /**
   * Wait for AI processing to complete
   */
  async waitForAiProcessingComplete(): Promise<void> {
    await this.waitForTypingComplete()
    await this.waitForElementHidden(this.loadingSpinner, 30000)
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.isElementVisible(this.errorMessage)
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getElementText(this.errorMessage)
  }

  /**
   * Click retry button for failed message
   */
  async clickRetry(): Promise<void> {
    await this.clickElement(this.retryButton)
  }

  /**
   * Clear chat history
   */
  async clearChat(): Promise<void> {
    await this.clickElement(this.clearChatButton)
  }

  /**
   * Check if insights section is visible
   */
  async hasInsights(): Promise<boolean> {
    return await this.isElementVisible(this.insightsSection)
  }

  /**
   * Get insights content
   */
  async getInsights(): Promise<string[]> {
    const insightElements = await this.page.locator(`${this.insightsSection} [data-testid="insight-item"]`).all()
    const insights = []

    for (const element of insightElements) {
      const text = await element.textContent()
      if (text) {
        insights.push(text.trim())
      }
    }

    return insights
  }

  /**
   * Check if KPI section is visible
   */
  async hasKpiSection(): Promise<boolean> {
    return await this.isElementVisible(this.kpiSection)
  }

  /**
   * Get KPI data
   */
  async getKpiData(): Promise<Array<{ name: string; value: string; trend?: string }>> {
    const kpiElements = await this.page.locator(`${this.kpiSection} [data-testid="kpi-item"]`).all()
    const kpis = []

    for (const element of kpiElements) {
      const name = await element.locator('[data-testid="kpi-name"]').textContent()
      const value = await element.locator('[data-testid="kpi-value"]').textContent()
      const trendElement = element.locator('[data-testid="kpi-trend"]')
      const trend = await trendElement.isVisible() ? await trendElement.textContent() : undefined

      kpis.push({
        name: name?.trim() || '',
        value: value?.trim() || '',
        trend: trend?.trim()
      })
    }

    return kpis
  }

  /**
   * Check if recommendations section is visible
   */
  async hasRecommendations(): Promise<boolean> {
    return await this.isElementVisible(this.recommendationsSection)
  }

  /**
   * Get recommendations
   */
  async getRecommendations(): Promise<string[]> {
    const recommendationElements = await this.page.locator(`${this.recommendationsSection} [data-testid="recommendation-item"]`).all()
    const recommendations = []

    for (const element of recommendationElements) {
      const text = await element.textContent()
      if (text) {
        recommendations.push(text.trim())
      }
    }

    return recommendations
  }

  /**
   * Export insights/conversation
   */
  async exportInsights(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.clickElement(this.exportButton)
    const download = await downloadPromise
    await download.saveAs('automation/fixtures/downloads/stratix-insights.pdf')
  }

  /**
   * Check company context indicator
   */
  async hasCompanyContext(): Promise<boolean> {
    return await this.isElementVisible(this.companyContextIndicator)
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<string> {
    return await this.getElementText(this.connectionStatus)
  }

  /**
   * Check if connection is online
   */
  async isConnectionOnline(): Promise<boolean> {
    const status = await this.getConnectionStatus()
    return status.toLowerCase().includes('online') || status.toLowerCase().includes('connected')
  }

  /**
   * Scroll to top of chat
   */
  async scrollToTopOfChat(): Promise<void> {
    await this.page.locator(this.messagesContainer).evaluate(element => {
      element.scrollTop = 0
    })
  }

  /**
   * Scroll to bottom of chat
   */
  async scrollToBottomOfChat(): Promise<void> {
    await this.page.locator(this.messagesContainer).evaluate(element => {
      element.scrollTop = element.scrollHeight
    })
  }

  /**
   * Copy message to clipboard
   */
  async copyMessage(messageIndex: number): Promise<void> {
    const copyButtons = await this.page.locator(this.copyButton).all()
    if (copyButtons[messageIndex]) {
      await copyButtons[messageIndex].click()
    }
  }

  /**
   * Provide feedback on AI response
   */
  async provideFeedback(messageIndex: number, positive: boolean): Promise<void> {
    const feedbackContainer = this.page.locator(this.feedbackButtons).nth(messageIndex)
    const button = positive ? 
      feedbackContainer.locator('[data-testid="thumbs-up"]') :
      feedbackContainer.locator('[data-testid="thumbs-down"]')
    
    await button.click()
  }

  /**
   * Check if voice input is available
   */
  async isVoiceInputAvailable(): Promise<boolean> {
    return await this.isElementVisible(this.voiceInputButton)
  }

  /**
   * Start voice input
   */
  async startVoiceInput(): Promise<void> {
    await this.clickElement(this.voiceInputButton)
  }

  /**
   * Test common business queries
   */
  async testBusinessAnalyticsQuery(): Promise<string> {
    return await this.sendMessageAndWaitForResponse(
      'Show me our top performing KPIs this quarter'
    )
  }

  async testStrategicPlanningQuery(): Promise<string> {
    return await this.sendMessageAndWaitForResponse(
      'Create an action plan to improve our marketing initiatives'
    )
  }

  async testDataExplorationQuery(): Promise<string> {
    return await this.sendMessageAndWaitForResponse(
      'Compare this quarter\'s performance with last quarter'
    )
  }

  async testOperationalInsightsQuery(): Promise<string> {
    return await this.sendMessageAndWaitForResponse(
      'Which areas need immediate attention based on current data?'
    )
  }

  /**
   * Validate AI response quality
   */
  async validateAiResponse(response: string, expectedKeywords: string[]): Promise<boolean> {
    const lowerResponse = response.toLowerCase()
    return expectedKeywords.some(keyword => 
      lowerResponse.includes(keyword.toLowerCase())
    )
  }

  /**
   * Wait for streaming response
   */
  async waitForStreamingResponse(timeout: number = 30000): Promise<void> {
    // Wait for streaming to start
    await this.waitForTypingIndicator()
    
    // Wait for streaming to complete
    await this.waitForAiProcessingComplete()
  }

  /**
   * Check if response contains data visualization
   */
  async hasDataVisualization(): Promise<boolean> {
    const chartSelectors = [
      '[data-testid="chart"]',
      '[data-testid="graph"]',
      '.recharts-wrapper',
      'canvas',
      'svg'
    ]

    for (const selector of chartSelectors) {
      if (await this.isElementVisible(selector)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if response contains formatted table
   */
  async hasFormattedTable(): Promise<boolean> {
    return await this.isElementVisible('table') || 
           await this.isElementVisible('[data-testid="data-table"]')
  }

  /**
   * Get message timestamp
   */
  async getMessageTimestamp(messageIndex: number): Promise<string> {
    const timestamps = await this.page.locator(this.messageTimestamp).all()
    if (timestamps[messageIndex]) {
      return await timestamps[messageIndex].textContent() || ''
    }
    return ''
  }

  /**
   * Verify real-time updates
   */
  async verifyRealTimeUpdates(): Promise<boolean> {
    const initialMessageCount = await this.getMessageCount()
    
    // Send a message
    await this.sendMessage('What are our current KPIs?')
    
    // Check if message count increased immediately (user message)
    const afterUserMessage = await this.getMessageCount()
    if (afterUserMessage !== initialMessageCount + 1) {
      return false
    }

    // Wait for AI response
    await this.waitForAiProcessingComplete()
    
    // Check if message count increased again (AI response)
    const afterAiResponse = await this.getMessageCount()
    return afterAiResponse === initialMessageCount + 2
  }

  /**
   * Test error recovery
   */
  async testErrorRecovery(): Promise<boolean> {
    // Mock network error
    await this.mockApiError(/stratix/, 500, 'Server error')
    
    // Send message
    await this.sendMessage('Test error recovery')
    
    // Check if error is displayed
    if (!await this.hasErrorMessage()) {
      return false
    }

    // Remove mock and retry
    await this.page.unroute(/stratix/)
    await this.clickRetry()
    
    // Should recover successfully
    await this.waitForAiProcessingComplete()
    return !await this.hasErrorMessage()
  }
}