'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Building2, 
  ChevronRight, 
  Globe, 
  LineChart, 
  Lock, 
  Rocket, 
  Shield, 
  Sparkles, 
  Target, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Award,
  Clock,
  FileBarChart,
  Layers,
  Brain
} from 'lucide-react'
import Link from 'next/link'
import { getThemeFromDomain, generateThemeCSS } from '@/lib/theme-config'

export default function DemoPage() {
  const router = useRouter()
  const [theme, setTheme] = useState(getThemeFromDomain('stratix-platform.vercel.app'))

  useEffect(() => {
    document.title = 'Stratix Platform - Enterprise Management Suite'
  }, [])

  const features = [
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track KPIs and OKRs with beautiful visualizations',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Users,
      title: 'Multi-tenant Support',
      description: 'Manage multiple organizations from one platform',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'Role-based Access',
      description: 'Granular permissions for CEO, Admin, Manager, and Analyst roles',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      icon: FileBarChart,
      title: 'Excel Integration',
      description: 'Import and process data from your existing spreadsheets',
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations and predictive analytics',
      gradient: 'from-teal-500 to-cyan-500'
    },
    {
      icon: Layers,
      title: 'Department OKRs',
      description: 'Track objectives and key results across all departments',
      gradient: 'from-cyan-500 to-blue-500'
    }
  ]

  const clients = [
    {
      name: 'FEMA Electricidad',
      industry: 'Energy & Utilities',
      logo: Zap,
      color: 'text-purple-400',
      metrics: {
        initiatives: 24,
        completion: 87,
        teams: 6
      }
    },
    {
      name: 'SIGA Turismo',
      industry: 'Travel & Tourism',
      logo: Globe,
      color: 'text-emerald-400',
      metrics: {
        initiatives: 18,
        completion: 92,
        teams: 4
      }
    }
  ]

  const stats = [
    { value: '500+', label: 'Active Organizations', icon: Building2 },
    { value: '10k+', label: 'Daily Users', icon: Users },
    { value: '99.9%', label: 'Uptime SLA', icon: Shield },
    { value: '24/7', label: 'Support Available', icon: Clock }
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
        {/* Navigation */}
        <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  Stratix Platform
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button 
                    variant="ghost" 
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="text-center">
              <Badge className="mb-4 backdrop-blur-sm bg-white/10 border-white/20 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Enterprise Management Platform
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-indigo-200 to-pink-200 bg-clip-text text-transparent mb-6">
                Transform Your Organization with Stratix
              </h1>
              <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
                The comprehensive management suite that helps you track initiatives, monitor KPIs, 
                and achieve your strategic objectives with real-time insights and AI-powered analytics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/login">
                  <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white px-8">
                    Start Free Trial
                    <Rocket className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 backdrop-blur-xl bg-white/5 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className="mb-4 backdrop-blur-sm bg-white/10 border-white/20 text-white">
                <Target className="h-3 w-3 mr-1" />
                Platform Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Comprehensive tools designed for modern organizations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
                >
                  <CardContent className="p-6">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${feature.gradient} inline-block mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/70">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Client Showcase */}
        <section className="py-24 backdrop-blur-xl bg-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className="mb-4 backdrop-blur-sm bg-white/10 border-white/20 text-white">
                <Award className="h-3 w-3 mr-1" />
                Success Stories
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent mb-4">
                Trusted by Leading Organizations
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                See how our clients achieve their strategic goals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {clients.map((client, index) => (
                <Card key={index} className="backdrop-blur-xl bg-white/5 border border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg bg-white/10 border border-white/20`}>
                          <client.logo className={`h-8 w-8 ${client.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-white">{client.name}</CardTitle>
                          <CardDescription className="text-white/60">{client.industry}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-white">{client.metrics.initiatives}</div>
                        <div className="text-sm text-white/60">Initiatives</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{client.metrics.completion}%</div>
                        <div className="text-sm text-white/60">Completion</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{client.metrics.teams}</div>
                        <div className="text-sm text-white/60">Teams</div>
                      </div>
                    </div>
                    <Link href={`/auth/login?demo=${client.name.toLowerCase().replace(' ', '-')}`}>
                      <Button 
                        variant="outline" 
                        className="w-full mt-6 border-white/20 text-white hover:bg-white/10"
                      >
                        View Demo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border border-white/20 rounded-3xl p-12">
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent mb-4">
                Ready to Transform Your Organization?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Join hundreds of companies using Stratix to achieve their strategic objectives
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/login">
                  <Button size="lg" className="bg-white text-indigo-900 hover:bg-white/90 px-8">
                    Start Your Free Trial
                    <CheckCircle2 className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10"
                >
                  Schedule Demo
                  <LineChart className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <p className="text-white/50 text-sm mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="backdrop-blur-xl bg-white/5 border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Stratix Platform</span>
              </div>
              <p className="text-white/50 text-sm">
                © 2025 Stratix Platform. Enterprise management made simple.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}