'use client';

import { StratixAssistant } from '@/components/stratix/stratix-assistant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageSquare, 
  Sparkles, 
  BarChart3, 
  Target, 
  Activity,
  TrendingUp,
  CheckCircle,
  Shield,
  Zap,
  Users,
  Building2
} from 'lucide-react';

export default function TestAIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Assistant
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade AI assistant powered by Google Gemini 2.0 Flash
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              Gemini 2.0 Flash
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Enterprise Security
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Real-time Streaming
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="chat" className="w-full max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Interface
            </TabsTrigger>
            <TabsTrigger value="features">
              <Sparkles className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="architecture">
              <Building2 className="w-4 h-4 mr-2" />
              Architecture
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Interface - Using existing component for compatibility */}
              <div className="lg:col-span-2">
                <StratixAssistant position="embedded" />
              </div>

              {/* Sample Questions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sample Questions</CardTitle>
                    <CardDescription>Try asking these questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                        <div className="flex items-start gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Performance Analysis</p>
                            <p className="text-xs text-muted-foreground">
                              "Show me the overall progress of our initiatives"
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Objectives Review</p>
                            <p className="text-xs text-muted-foreground">
                              "What are our top performing objectives?"
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                        <div className="flex items-start gap-2">
                          <Activity className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Activity Tracking</p>
                            <p className="text-xs text-muted-foreground">
                              "List activities that need attention"
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Trend Analysis</p>
                            <p className="text-xs text-muted-foreground">
                              "Analyze performance trends this quarter"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Capabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Real-time data analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Role-based insights</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Strategic recommendations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Performance predictions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <Brain className="w-8 h-8 text-blue-500 mb-2" />
                  <CardTitle>Intelligent Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Advanced AI-powered analysis of organizational data with context-aware insights
                    and recommendations tailored to your role and responsibilities.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="w-8 h-8 text-green-500 mb-2" />
                  <CardTitle>Role-Based Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Automatic data filtering based on user roles (CEO, Admin, Manager) ensuring
                    security and relevant information delivery.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="w-8 h-8 text-purple-500 mb-2" />
                  <CardTitle>Real-Time Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Live access to initiative progress, objective completion rates, and performance
                    KPIs with automatic trend detection.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Target className="w-8 h-8 text-orange-500 mb-2" />
                  <CardTitle>OKR Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Strategic guidance for setting and achieving objectives with best practices
                    and predictive success analysis.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="w-8 h-8 text-red-500 mb-2" />
                  <CardTitle>Enterprise Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bank-grade security with authenticated sessions, encrypted data transmission,
                    and audit logging for compliance.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                  <CardTitle>Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Streaming responses with sub-second latency powered by Google's latest
                    Gemini 2.0 Flash model.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Stack</CardTitle>
                  <CardDescription>Enterprise-grade technology</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">AI Model</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Google Gemini 2.0 Flash (gemini-2.0-flash-exp)</li>
                        <li>• 2M context window</li>
                        <li>• Multi-modal capabilities</li>
                        <li>• Tool calling support</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Backend</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Next.js 15 App Router</li>
                        <li>• Vercel AI SDK</li>
                        <li>• Supabase with RLS</li>
                        <li>• Edge Runtime</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Frontend</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• React 19</li>
                        <li>• TypeScript</li>
                        <li>• Tailwind CSS</li>
                        <li>• Radix UI Components</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Flow</CardTitle>
                  <CardDescription>Secure and efficient architecture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        JWT-based authentication with Supabase Auth ensures secure access
                        to user-specific data and AI capabilities.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Data Access</h4>
                      <p className="text-sm text-muted-foreground">
                        Row Level Security (RLS) policies automatically filter data based on
                        user roles and tenant isolation.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">AI Processing</h4>
                      <p className="text-sm text-muted-foreground">
                        User queries are enriched with organizational context and processed
                        through Gemini with streaming responses.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Response Streaming</h4>
                      <p className="text-sm text-muted-foreground">
                        Server-Sent Events (SSE) enable real-time streaming of AI responses
                        with progressive rendering.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}