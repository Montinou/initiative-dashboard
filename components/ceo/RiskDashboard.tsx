"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  AlertTriangle,
  TrendingDown,
  Clock,
  Users,
  Target,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Risk {
  id: string
  initiative_id: string
  initiative_title: string
  area_name: string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  risk_type: 'timeline' | 'resource' | 'budget' | 'quality' | 'scope'
  description: string
  impact_score: number
  probability_score: number
  current_progress: number
  expected_progress: number
  days_behind?: number
  mitigation_status: 'not_started' | 'in_progress' | 'completed'
  owner_name?: string
  due_date: string
}

interface RiskDashboardProps {
  risks?: Risk[]
  loading: boolean
  className?: string
}

export function RiskDashboard({ 
  risks = [], 
  loading,
  className 
}: RiskDashboardProps) {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null)
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="glassmorphic-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mock data if no risks provided
  const mockRisks: Risk[] = risks.length > 0 ? risks : [
    {
      id: '1',
      initiative_id: 'init-1',
      initiative_title: 'Digital Transformation Phase 2',
      area_name: 'Technology',
      risk_level: 'critical',
      risk_type: 'timeline',
      description: 'Project is 3 weeks behind schedule due to resource constraints',
      impact_score: 9,
      probability_score: 8,
      current_progress: 45,
      expected_progress: 68,
      days_behind: 21,
      mitigation_status: 'in_progress',
      owner_name: 'John Smith',
      due_date: '2025-03-15'
    },
    {
      id: '2',
      initiative_id: 'init-2',
      initiative_title: 'Market Expansion - APAC',
      area_name: 'Sales',
      risk_level: 'high',
      risk_type: 'budget',
      description: 'Budget overrun by 15% due to unexpected regulatory costs',
      impact_score: 7,
      probability_score: 6,
      current_progress: 62,
      expected_progress: 70,
      days_behind: 8,
      mitigation_status: 'not_started',
      owner_name: 'Sarah Johnson',
      due_date: '2025-04-30'
    },
    {
      id: '3',
      initiative_id: 'init-3',
      initiative_title: 'Customer Portal Redesign',
      area_name: 'Product',
      risk_level: 'medium',
      risk_type: 'quality',
      description: 'User testing revealing UX issues that need addressing',
      impact_score: 5,
      probability_score: 6,
      current_progress: 78,
      expected_progress: 80,
      days_behind: 2,
      mitigation_status: 'in_progress',
      owner_name: 'Mike Chen',
      due_date: '2025-02-28'
    }
  ]

  const filteredRisks = selectedRiskLevel 
    ? mockRisks.filter(r => r.risk_level === selectedRiskLevel)
    : mockRisks

  const getRiskLevelColor = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getRiskTypeIcon = (type: string) => {
    switch(type) {
      case 'timeline': return Clock
      case 'resource': return Users
      case 'budget': return TrendingDown
      case 'quality': return AlertCircle
      case 'scope': return Target
      default: return AlertTriangle
    }
  }

  const getMitigationStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-green-400'
      case 'in_progress': return 'text-yellow-400'
      case 'not_started': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const riskStats = {
    critical: mockRisks.filter(r => r.risk_level === 'critical').length,
    high: mockRisks.filter(r => r.risk_level === 'high').length,
    medium: mockRisks.filter(r => r.risk_level === 'medium').length,
    low: mockRisks.filter(r => r.risk_level === 'low').length,
    total: mockRisks.length
  }

  const avgRiskScore = mockRisks.length > 0
    ? mockRisks.reduce((acc, r) => acc + (r.impact_score * r.probability_score), 0) / mockRisks.length
    : 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glassmorphic-card bg-gradient-to-br from-red-600/20 to-red-800/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-400">{riskStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-card bg-gradient-to-br from-orange-600/20 to-orange-800/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">High</p>
                <p className="text-2xl font-bold text-orange-400">{riskStats.high}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-card bg-gradient-to-br from-yellow-600/20 to-yellow-800/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Medium</p>
                <p className="text-2xl font-bold text-yellow-400">{riskStats.medium}</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-card bg-gradient-to-br from-green-600/20 to-green-800/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Low</p>
                <p className="text-2xl font-bold text-green-400">{riskStats.low}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-card bg-gradient-to-br from-purple-600/20 to-purple-800/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Avg Risk Score</p>
                <p className="text-2xl font-bold text-purple-400">{avgRiskScore.toFixed(1)}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Filter Buttons */}
      <Card className="glassmorphic-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              At-Risk Initiatives
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedRiskLevel === null ? "default" : "outline"}
                onClick={() => setSelectedRiskLevel(null)}
                className="text-xs"
              >
                All ({riskStats.total})
              </Button>
              {['critical', 'high', 'medium', 'low'].map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={selectedRiskLevel === level ? "default" : "outline"}
                  onClick={() => setSelectedRiskLevel(level)}
                  className="text-xs capitalize"
                >
                  {level} ({riskStats[level as keyof typeof riskStats]})
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRisks.map((risk, index) => {
              const RiskIcon = getRiskTypeIcon(risk.risk_type)
              const riskScore = risk.impact_score * risk.probability_score
              
              return (
                <motion.div
                  key={risk.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card 
                    className={cn(
                      "glassmorphic-card hover:bg-white/5 transition-all cursor-pointer",
                      expandedRisk === risk.id && "ring-2 ring-primary/50"
                    )}
                    onClick={() => setExpandedRisk(
                      expandedRisk === risk.id ? null : risk.id
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Risk Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <RiskIcon className="h-4 w-4 text-gray-400" />
                              <h3 className="text-white font-medium">
                                {risk.initiative_title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", getRiskLevelColor(risk.risk_level))}
                              >
                                {risk.risk_level}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">
                              {risk.description}
                            </p>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 text-gray-400 transition-transform",
                            expandedRisk === risk.id && "rotate-90"
                          )} />
                        </div>

                        {/* Risk Metrics */}
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-400">Area</p>
                            <p className="text-sm text-white">{risk.area_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Risk Score</p>
                            <p className="text-sm text-white font-medium">{riskScore}/100</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Days Behind</p>
                            <p className="text-sm text-red-400 font-medium">
                              {risk.days_behind || 0} days
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Mitigation</p>
                            <p className={cn("text-sm font-medium", getMitigationStatusColor(risk.mitigation_status))}>
                              {risk.mitigation_status.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        {/* Progress Comparison */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Current Progress</span>
                            <span className="text-white">{risk.current_progress}%</span>
                          </div>
                          <Progress value={risk.current_progress} className="h-2" />
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Expected Progress</span>
                            <span className="text-yellow-400">{risk.expected_progress}%</span>
                          </div>
                          <Progress value={risk.expected_progress} className="h-2 bg-yellow-900/20" />
                        </div>

                        {/* Expanded Details */}
                        {expandedRisk === risk.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-3 border-t border-white/10"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Risk Owner</p>
                                <p className="text-sm text-white">{risk.owner_name || 'Unassigned'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Due Date</p>
                                <p className="text-sm text-white">
                                  {new Date(risk.due_date).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Impact Score</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={risk.impact_score * 10} className="h-1.5 flex-1" />
                                  <span className="text-sm text-white">{risk.impact_score}/10</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Probability</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={risk.probability_score * 10} className="h-1.5 flex-1" />
                                  <span className="text-sm text-white">{risk.probability_score}/10</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 flex gap-2">
                              <Button size="sm" className="glassmorphic-button">
                                View Initiative
                              </Button>
                              <Button size="sm" variant="outline" className="glassmorphic-button-ghost">
                                Mitigation Plan
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}