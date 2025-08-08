'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Copy,
  ArrowRight,
  Filter
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Use real API data
const objectives: any[] = []

const priorityColors = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
}

const statusColors = {
  planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  on_hold: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30'
}

const quarters = ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024']

export default function ObjectivesManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [quarterFilter, setQuarterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')

  // Filter objectives
  const filteredObjectives = objectives.filter(objective => {
    const matchesSearch = 
      objective.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      objective.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      objective.area.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesArea = areaFilter === 'all' || objective.area.id === areaFilter
    const matchesQuarter = quarterFilter === 'all' || objective.quarter === quarterFilter
    const matchesStatus = statusFilter === 'all' || objective.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || objective.priority === priorityFilter

    return matchesSearch && matchesArea && matchesQuarter && matchesStatus && matchesPriority
  })

  // Get unique areas for filter
  const areas = Array.from(new Set(objectives.map(o => o.area))).reduce((acc: any[], area) => {
    if (!acc.find(a => a.id === area.id)) acc.push(area)
    return acc
  }, [])

  const handleEditObjective = (objectiveId: string) => {
    console.log('Edit objective:', objectiveId)
  }

  const handleDuplicateObjective = (objectiveId: string) => {
    console.log('Duplicate objective:', objectiveId)
  }

  const handleDeleteObjective = (objectiveId: string) => {
    console.log('Delete objective:', objectiveId)
  }

  const toggleObjectiveSelection = (objectiveId: string) => {
    setSelectedObjectives(prev => 
      prev.includes(objectiveId) 
        ? prev.filter(id => id !== objectiveId)
        : [...prev, objectiveId]
    )
  }

  const handleBulkAction = (action: string) => {
    console.log('Bulk action:', action, 'for objectives:', selectedObjectives)
    setSelectedObjectives([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'in_progress': return TrendingUp
      case 'planning': return Target
      case 'on_hold': return XCircle
      case 'overdue': return AlertTriangle
      default: return Target
    }
  }

  // Calculate stats
  const totalObjectives = objectives.length
  const completedObjectives = objectives.filter(o => o.status === 'completed').length
  const inProgressObjectives = objectives.filter(o => o.status === 'in_progress').length
  const overdueObjectives = objectives.filter(o => 
    o.status !== 'completed' && new Date(o.target_date) < new Date()
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Objectives Management</h1>
          <p className="text-gray-400 mt-2">
            Manage organizational objectives across all areas and quarters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Bulk Actions
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Objective
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Objectives</p>
                <p className="text-2xl font-bold text-white">{totalObjectives}</p>
                <p className="text-xs text-green-400">{completedObjectives} completed</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{inProgressObjectives}</p>
                <p className="text-xs text-blue-400">Active work</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round((completedObjectives / totalObjectives) * 100)}%
                </p>
                <p className="text-xs text-green-400">On track</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-red-400">{overdueObjectives}</p>
                <p className="text-xs text-red-400">Need attention</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Controls */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search objectives by title, description, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Quarters</SelectItem>
                  {quarters.map((quarter) => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedObjectives.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-primary font-medium">
                {selectedObjectives.length} objective{selectedObjectives.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('change-quarter')}>
                  Change Quarter
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('change-area')}>
                  Reassign Area
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('update-priority')}>
                  Update Priority
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedObjectives([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Objectives List */}
      <div className="space-y-4">
        {/* Group by Area */}
        {areas.map((area: any) => {
          const areaObjectives = filteredObjectives.filter(o => o.area.id === area.id)
          if (areaObjectives.length === 0) return null

          return (
            <Card key={area.id} className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-white">{area.name}</CardTitle>
                    <Badge variant="outline">{areaObjectives.length} objectives</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Objective
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {areaObjectives.map((objective) => {
                    const StatusIcon = getStatusIcon(objective.status)
                    const isSelected = selectedObjectives.includes(objective.id)
                    const isOverdue = objective.status !== 'completed' && new Date(objective.target_date) < new Date()
                    
                    return (
                      <div key={objective.id} className={`p-4 rounded-lg border transition-all ${
                        isSelected ? 'bg-primary/10 border-primary/30' : 'bg-gray-800 border-gray-700'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleObjectiveSelection(objective.id)}
                              className="rounded border-gray-600 bg-gray-700 mt-1"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-white font-medium">{objective.title}</h4>
                                <Badge className={priorityColors[objective.priority]}>
                                  {objective.priority}
                                </Badge>
                                <Badge className={statusColors[isOverdue ? 'overdue' : objective.status]}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {isOverdue ? 'Overdue' : objective.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline">{objective.quarter}</Badge>
                              </div>
                              
                              <p className="text-gray-400 text-sm mb-3">{objective.description}</p>
                              
                              {/* Progress Bar */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-400">Progress</span>
                                  <span className="text-white">{objective.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-primary rounded-full h-2 transition-all"
                                    style={{ width: `${objective.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              {/* Metrics and Details */}
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {objective.completed_initiatives}/{objective.initiatives_count} initiatives
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {new Date(objective.target_date).toLocaleDateString()}
                                </div>
                                {objective.metrics.length > 0 && (
                                  <div className="text-xs text-blue-400">
                                    {objective.metrics.join(' • ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                              <DropdownMenuItem 
                                className="text-white hover:bg-gray-700"
                                onClick={() => handleEditObjective(objective.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Objective
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-white hover:bg-gray-700"
                                onClick={() => handleDuplicateObjective(objective.id)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                className="text-red-400 hover:bg-red-500/10"
                                onClick={() => handleDeleteObjective(objective.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredObjectives.length === 0 && (
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No objectives found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || areaFilter !== 'all' || quarterFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
                ? "No objectives match your search criteria"
                : "Get started by creating your first organizational objective"
              }
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Objective
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}