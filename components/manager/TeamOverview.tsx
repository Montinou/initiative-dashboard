"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/blocks/tables/data-table'
import { PieChartBlock } from '@/components/blocks/charts/dashboard-charts'
import { 
  User, 
  Mail, 
  Phone, 
  Activity, 
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare,
  Calendar,
  Award
} from 'lucide-react'
import type { TeamMember } from '@/hooks/useManagerViews'
import { ColumnDef } from '@tanstack/react-table'

interface TeamOverviewProps {
  areaId: string
  teamMembers: TeamMember[]
  onRefresh: () => void
}

export function TeamOverview({ areaId, teamMembers, onRefresh }: TeamOverviewProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  // Calculate team statistics
  const totalAssignedActivities = teamMembers.reduce((sum, member) => 
    sum + member.assigned_activities, 0
  )
  const totalCompletedActivities = teamMembers.reduce((sum, member) => 
    sum + member.completed_activities, 0
  )
  const teamCompletionRate = totalAssignedActivities > 0 
    ? Math.round((totalCompletedActivities / totalAssignedActivities) * 100)
    : 0

  // Team performance data for chart
  const performanceData = teamMembers.map(member => ({
    name: member.full_name?.split(' ')[0] || 'Unknown',
    completion_rate: member.assigned_activities > 0 
      ? Math.round((member.completed_activities / member.assigned_activities) * 100)
      : 0
  }))

  // Table columns
  const columns: ColumnDef<TeamMember>[] = [
    {
      accessorKey: 'full_name',
      header: 'Team Member',
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar_url || ''} alt={member.full_name || ''} />
              <AvatarFallback>
                {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{member.full_name}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'assigned_activities',
      header: 'Assigned',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('assigned_activities')} activities
        </Badge>
      )
    },
    {
      accessorKey: 'completed_activities',
      header: 'Completed',
      cell: ({ row }) => (
        <Badge variant="default">
          {row.getValue('completed_activities')} done
        </Badge>
      )
    },
    {
      id: 'completion_rate',
      header: 'Completion Rate',
      cell: ({ row }) => {
        const member = row.original
        const rate = member.assigned_activities > 0 
          ? Math.round((member.completed_activities / member.assigned_activities) * 100)
          : 0
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{rate}%</span>
              {rate >= 80 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : rate >= 60 ? (
                <Clock className="h-4 w-4 text-yellow-500" />
              ) : (
                <Activity className="h-4 w-4 text-red-500" />
              )}
            </div>
            <Progress value={rate} className="h-1" />
          </div>
        )
      }
    },
    {
      accessorKey: 'performance_score',
      header: 'Performance',
      cell: ({ row }) => {
        const score = row.getValue('performance_score') as number || 0
        return (
          <Badge 
            variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"}
          >
            {score}/100
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const member = row.original
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedMember(member)}
          >
            View Details
          </Button>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalAssignedActivities}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalCompletedActivities}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{teamCompletionRate}%</p>
                <p className="text-sm text-muted-foreground">Team Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={teamMembers}
                searchKey="full_name"
              />
            </CardContent>
          </Card>
        </div>

        {/* Performance Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartBlock
              title=""
              data={performanceData}
              dataKey="completion_rate"
              nameKey="name"
              config={{
                completion_rate: {
                  label: "Completion Rate %",
                  color: "hsl(var(--chart-1))"
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMember.avatar_url || ''} />
                  <AvatarFallback>
                    {selectedMember.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
                </div>
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Contact Information</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedMember.email}</span>
                  </div>
                  {selectedMember.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedMember.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Award className="h-4 w-4" />
                  <span>Performance Metrics</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Activities Assigned</span>
                      <span>{selectedMember.assigned_activities}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Activities Completed</span>
                      <span>{selectedMember.completed_activities}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Active Initiatives</span>
                      <span>{selectedMember.active_initiatives}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Performance Score</span>
                      <span>{selectedMember.performance_score || 0}/100</span>
                    </div>
                    <Progress value={selectedMember.performance_score || 0} className="h-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-6 pt-4 border-t">
              <Button size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}