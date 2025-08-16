# AI Services Integration Documentation

## Overview
The Initiative Dashboard integrates multiple AI services to provide intelligent insights, natural language processing, and conversational interfaces for enhanced user experience.

## Services Integrated

1. **Google Gemini** - Generative AI for insights and content
2. **Vertex AI** - Enterprise AI platform
3. **Dialogflow CX** - Conversational AI and chatbots
4. **Stratix AI** - Custom AI backend for dashboard intelligence

## Configuration

### Environment Variables
```env
# Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyCBAFNZsH-_14GnsNGPFSMRdZMwnFSBX-4

# Vertex AI
GCP_PROJECT_ID=insaight-backend
GOOGLE_APPLICATION_CREDENTIALS_JSON=base64_encoded_service_account

# Dialogflow
NEXT_PUBLIC_DF_PROJECT_ID=insaight-backend
NEXT_PUBLIC_DF_LOCATION=us-central1
NEXT_PUBLIC_DF_AGENT_ID=7f297240-ca50-4896-8b71-e82fd707fa88
NEXT_PUBLIC_DF_ENABLED=true

# Stratix AI
NEXT_PUBLIC_ENABLE_STRATIX=true
NEXT_PUBLIC_STRATIX_API_URL=https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative
```

## Google Gemini Integration

### Service Implementation (`lib/gemini-service.ts`)
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

export class GeminiService {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-pro' 
  });

  // Generate content
  async generateContent(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // Stream content
  async *streamContent(prompt: string) {
    const result = await this.model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }

  // Generate embeddings
  async generateEmbeddings(text: string) {
    const embeddingModel = genAI.getGenerativeModel({
      model: 'embedding-001'
    });
    
    const result = await embeddingModel.embedContent(text);
    return result.embedding;
  }
}
```

### Hook Implementation (`hooks/useGeminiAssistant.ts`)
```typescript
export function useGeminiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content,
          context: messages 
        }),
      });

      const data = await response.json();
      setMessages([...messages, 
        { role: 'user', content },
        { role: 'assistant', content: data.response }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading };
}
```

### Use Cases
- **Dashboard Insights**: Generate insights from OKR data
- **Report Generation**: Create executive summaries
- **Data Analysis**: Natural language queries on metrics
- **Content Suggestions**: Objective and initiative recommendations

## Vertex AI Integration

### Client Setup (`lib/vertex-ai-client.ts`)
```typescript
import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';

export class VertexAIClient {
  private auth: GoogleAuth;
  private vertexAI: VertexAI;

  constructor() {
    this.auth = new GoogleAuth({
      projectId: 'insaight-backend',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    this.vertexAI = new VertexAI({
      project: 'insaight-backend',
      location: 'us-central1',
    });
  }

  // Text generation
  async generateText(prompt: string, model: string = 'text-bison') {
    const generativeModel = this.vertexAI.preview.getGenerativeModel({
      model: model,
    });

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return result.response.candidates[0].content;
  }

  // Custom model prediction
  async predict(endpointId: string, instances: any[]) {
    const endpoint = this.vertexAI.preview.getEndpoint(endpointId);
    const prediction = await endpoint.predict({ instances });
    return prediction.predictions;
  }
}
```

### Advanced Features
```typescript
// Function calling
const functionDeclarations = [{
  name: 'getInitiativeProgress',
  description: 'Get progress of an initiative',
  parameters: {
    type: 'object',
    properties: {
      initiativeId: { type: 'string' },
    },
    required: ['initiativeId'],
  },
}];

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  tools: [{ functionDeclarations }],
});
```

## Dialogflow CX Integration

### Configuration (`lib/dialogflow-config.ts`)
```typescript
export const dialogflowConfig = {
  projectId: process.env.NEXT_PUBLIC_DF_PROJECT_ID!,
  location: process.env.NEXT_PUBLIC_DF_LOCATION!,
  agentId: process.env.NEXT_PUBLIC_DF_AGENT_ID!,
  languageCode: 'en-US',
};

export class DialogflowClient {
  private sessionClient: SessionsClient;
  private sessionPath: string;

  constructor(sessionId: string) {
    this.sessionClient = new SessionsClient({
      apiEndpoint: `${dialogflowConfig.location}-dialogflow.googleapis.com`,
    });

    this.sessionPath = this.sessionClient.projectLocationAgentSessionPath(
      dialogflowConfig.projectId,
      dialogflowConfig.location,
      dialogflowConfig.agentId,
      sessionId
    );
  }

  async detectIntent(text: string) {
    const request = {
      session: this.sessionPath,
      queryInput: {
        text: {
          text: text,
        },
        languageCode: dialogflowConfig.languageCode,
      },
    };

    const [response] = await this.sessionClient.detectIntent(request);
    return response.queryResult;
  }
}
```

### Chat Widget Component
```typescript
export function DialogflowChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => generateSessionId());

  const sendMessage = async (text: string) => {
    // Add user message
    setMessages(prev => [...prev, { 
      type: 'user', 
      text 
    }]);

    // Send to Dialogflow
    const response = await fetch('/api/dialogflow/detect-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId }),
    });

    const data = await response.json();
    
    // Add bot response
    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: data.fulfillmentText,
      payload: data.payload,
    }]);
  };

  return (
    <ChatInterface
      isOpen={isOpen}
      messages={messages}
      onSend={sendMessage}
      onToggle={() => setIsOpen(!isOpen)}
    />
  );
}
```

### Intent Handlers
```typescript
// API Route: /api/dialogflow/webhook
export async function POST(req: Request) {
  const { queryResult, session } = await req.json();
  const intent = queryResult.intent.displayName;

  switch (intent) {
    case 'get.initiative.progress':
      return handleGetProgress(queryResult.parameters);
    
    case 'create.objective':
      return handleCreateObjective(queryResult.parameters);
    
    case 'list.overdue.activities':
      return handleListOverdue(session);
    
    default:
      return defaultResponse();
  }
}

async function handleGetProgress(parameters: any) {
  const { initiativeName } = parameters;
  
  const initiative = await getInitiativeByName(initiativeName);
  
  return {
    fulfillmentText: `${initiative.title} is ${initiative.progress}% complete.`,
    payload: {
      initiative,
      chartData: generateProgressChart(initiative),
    },
  };
}
```

## Stratix AI Backend

### Integration (`lib/stratix/dashboard-ai-integration.ts`)
```typescript
export class StratixAI {
  private baseUrl = process.env.NEXT_PUBLIC_STRATIX_API_URL!;

  async getInsights(context: DashboardContext): Promise<Insight[]> {
    const response = await fetch(`${this.baseUrl}/insights`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getToken()}`,
      },
      body: JSON.stringify({
        tenantId: context.tenantId,
        userId: context.userId,
        role: context.role,
        dateRange: context.dateRange,
      }),
    });

    return response.json();
  }

  async generateReport(parameters: ReportParams): Promise<Report> {
    const response = await fetch(`${this.baseUrl}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parameters),
    });

    return response.json();
  }

  async predictCompletion(initiativeId: string): Promise<Prediction> {
    const response = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiativeId }),
    });

    return response.json();
  }
}
```

### Dashboard Widget
```typescript
export function StratixDashboardWidget() {
  const { insights, loading } = useStratixInsights();
  const [selectedInsight, setSelectedInsight] = useState(null);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="stratix-widget">
      <h3>AI Insights</h3>
      <div className="insights-grid">
        {insights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onClick={() => setSelectedInsight(insight)}
          />
        ))}
      </div>
      
      {selectedInsight && (
        <InsightDetail
          insight={selectedInsight}
          onAction={handleInsightAction}
        />
      )}
    </div>
  );
}
```

## Prompt Engineering

### System Prompts
```typescript
const SYSTEM_PROMPTS = {
  dashboard_assistant: `
    You are an AI assistant for an OKR management dashboard.
    Your role is to help users understand their objectives, 
    track progress, and provide actionable insights.
    
    Context:
    - User Role: {role}
    - Tenant: {tenant}
    - Current Quarter: {quarter}
    
    Guidelines:
    1. Be concise and actionable
    2. Focus on data-driven insights
    3. Suggest specific improvements
    4. Maintain professional tone
  `,
  
  report_generator: `
    Generate an executive summary for OKR performance.
    Include:
    1. Overall progress metrics
    2. Key achievements
    3. Areas of concern
    4. Recommendations
    
    Format as structured markdown with clear sections.
  `,
};
```

### Context Injection
```typescript
function buildPromptWithContext(
  basePrompt: string,
  context: any
): string {
  return `
    ${basePrompt}
    
    Current Data:
    - Objectives: ${context.objectives.length}
    - Average Progress: ${context.avgProgress}%
    - At Risk Items: ${context.atRiskCount}
    
    Recent Activity:
    ${context.recentActivity.map(a => `- ${a.description}`).join('\n')}
    
    User Question: ${context.userQuery}
  `;
}
```

## Streaming Responses

### Server-Sent Events Implementation
```typescript
// API Route: /api/ai/stream
export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        for await (const chunk of generateStreamResponse(prompt)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client-Side Consumption
```typescript
export function useStreamingAI() {
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendPrompt = async (prompt: string) => {
    setIsStreaming(true);
    setResponse('');

    const eventSource = new EventSource(
      `/api/ai/stream?prompt=${encodeURIComponent(prompt)}`
    );

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setIsStreaming(false);
        return;
      }

      const chunk = JSON.parse(event.data);
      setResponse(prev => prev + chunk.text);
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsStreaming(false);
    };
  };

  return { response, sendPrompt, isStreaming };
}
```

## Rate Limiting & Quotas

### API Rate Limiting
```typescript
const rateLimits = {
  gemini: {
    requestsPerMinute: 60,
    tokensPerMinute: 1000000,
    tokensPerDay: 1000000000,
  },
  vertex: {
    requestsPerMinute: 600,
    predictionsPerMonth: 100000,
  },
  dialogflow: {
    requestsPerMinute: 600,
    sessionsPerDay: 50000,
  },
};

export async function checkAIRateLimit(
  service: string,
  userId: string
): Promise<boolean> {
  const key = `ai-rate:${service}:${userId}`;
  const limit = rateLimits[service].requestsPerMinute;
  
  return await checkRateLimit(key, limit, 60);
}
```

## Error Handling

### Graceful Degradation
```typescript
export async function getAIResponse(
  prompt: string,
  options: AIOptions = {}
): Promise<string> {
  const services = [
    { name: 'gemini', fn: () => geminiService.generate(prompt) },
    { name: 'vertex', fn: () => vertexService.generate(prompt) },
    { name: 'fallback', fn: () => getFallbackResponse(prompt) },
  ];

  for (const service of services) {
    try {
      return await service.fn();
    } catch (error) {
      console.error(`${service.name} failed:`, error);
      continue;
    }
  }

  return 'AI services temporarily unavailable';
}
```

## Monitoring & Analytics

### Usage Tracking
```typescript
export async function trackAIUsage(
  service: string,
  operation: string,
  metadata: any
) {
  await analytics.track({
    event: 'ai_usage',
    properties: {
      service,
      operation,
      tokensUsed: metadata.tokens,
      latency: metadata.latency,
      success: metadata.success,
      timestamp: new Date().toISOString(),
    },
  });
}
```

### Performance Metrics
```typescript
export function measureAIPerformance() {
  return {
    averageLatency: calculateAverage(latencies),
    successRate: (successes / total) * 100,
    tokenUsage: {
      daily: getDailyTokenUsage(),
      monthly: getMonthlyTokenUsage(),
    },
    costEstimate: calculateCost(tokenUsage),
  };
}
```

## Security Considerations

1. **API Key Management**
   - Store keys in environment variables
   - Use Secret Manager for production
   - Rotate keys regularly

2. **Input Validation**
   - Sanitize user inputs
   - Implement prompt injection prevention
   - Limit prompt length

3. **Output Filtering**
   - Filter sensitive information
   - Validate AI responses
   - Implement content moderation

4. **Access Control**
   - Role-based AI feature access
   - Per-tenant usage limits
   - Audit AI interactions

## Best Practices

1. **Cache AI Responses** when appropriate
2. **Implement retry logic** with exponential backoff
3. **Use streaming** for long responses
4. **Provide feedback mechanisms** for AI quality
5. **Monitor costs** and usage patterns
6. **Implement fallbacks** for AI failures
7. **Version prompts** for consistency
8. **Test edge cases** thoroughly

## Troubleshooting

### Common Issues

1. **Quota Exceeded**
   - Check usage metrics
   - Implement caching
   - Upgrade quota limits

2. **Slow Response Times**
   - Use streaming responses
   - Optimize prompts
   - Consider model selection

3. **Inconsistent Results**
   - Review prompt engineering
   - Adjust temperature settings
   - Add more context

### Debug Tools
```typescript
// Enable debug logging
export const AI_DEBUG = process.env.NODE_ENV === 'development';

export function debugAI(operation: string, data: any) {
  if (AI_DEBUG) {
    console.log(`[AI Debug] ${operation}:`, data);
  }
}
```

## References

- [Gemini API Docs](https://ai.google.dev/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Dialogflow CX Guide](https://cloud.google.com/dialogflow/cx/docs)
- [AI Best Practices](https://cloud.google.com/architecture/ai-ml-best-practices)