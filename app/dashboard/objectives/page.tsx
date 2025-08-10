"use client"

import React from "react"
import { useObjectives } from "@/hooks/useObjectives"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Plus,
  ChevronRight,
  Zap
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { TableLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ObjectiveWithRelations } from "@/lib/types/database"

function ObjectiveCard({ objective }: { objective: ObjectiveWithRelations }) {
  // Calculate progress based on linked initiatives
  const totalInitiatives = objective.initiatives?.length || 0;
  const avgProgress = totalInitiatives > 0
    ? Math.round(
        objective.initiatives!.reduce((acc, init) => acc + (init.progress || 0), 0) / totalInitiatives
      )
    : 0;

  // Get quarters display
  const quartersDisplay = objective.quarters?.map(q => q.quarter_name).join(", ") || "No quarters assigned";

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg text-white">{objective.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{objective.area?.name || "No area"}</span>
              <span>•</span>
              <span>{quartersDisplay}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>View Initiatives</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {objective.description && (
          <p className="text-sm text-gray-400">{objective.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-300">
              {totalInitiatives} {totalInitiatives === 1 ? "Initiative" : "Initiatives"}
            </span>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Active
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Average Progress</span>
            <span className="text-white font-medium">{avgProgress}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>

        {/* Show linked initiatives preview */}
        {objective.initiatives && objective.initiatives.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Linked Initiatives</p>
            <div className="space-y-1">
              {objective.initiatives.slice(0, 3).map((init) => (
                <div key={init.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate">{init.title}</span>
                  <span className="text-gray-500">{init.progress}%</span>
                </div>
              ))}
              {objective.initiatives.length > 3 && (
                <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                  View all {objective.initiatives.length} initiatives
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ObjectivesPage() {
  const { objectives, isLoading, error } = useObjectives()

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load objectives"
          description="There was an error loading your objectives. Please try refreshing the page."
          action={{
            label: "Refresh",
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Objectives</h1>
        </div>
        <TableLoadingSkeleton />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Objectives</h1>
            <p className="text-gray-400 mt-2">
              High-level goals that group your strategic initiatives
            </p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Objective
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-sm border border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Objectives</p>
                  <p className="text-2xl font-bold text-white">{objectives.length}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-sm border border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Initiatives</p>
                  <p className="text-2xl font-bold text-white">
                    {objectives.reduce((acc, obj) => acc + (obj.initiatives?.length || 0), 0)}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-sm border border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Progress</p>
                  <p className="text-2xl font-bold text-white">
                    {objectives.length > 0
                      ? Math.round(
                          objectives.reduce((acc, obj) => {
                            const initiatives = obj.initiatives || [];
                            const avgProgress = initiatives.length > 0
                              ? initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / initiatives.length
                              : 0;
                            return acc + avgProgress;
                          }, 0) / objectives.length
                        )
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Objectives Grid */}
        {objectives && objectives.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {objectives.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No objectives yet"
            description="Create your first objective to start organizing your initiatives"
            action={{
              label: "Create Objective",
              onClick: () => console.log("Create objective")
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}