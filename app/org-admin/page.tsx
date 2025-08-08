'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  Target, 
  UserPlus, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useProfile } from '@/lib/profile-context'
import { useOrgAdminStats } from '@/hooks/useOrgAdminStats'

const quickActions = [
  {
    title: 'Create New Area',
    description: 'Set up a new organizational area',
    href: '/org-admin/areas',
    icon: Building2,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  {
    title: 'Invite Users',
    description: 'Send invitations to new team members',
    href: '/org-admin/invitations',
    icon: UserPlus,
    color: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  {
    title: 'Assign Objectives',
    description: 'Create and assign new objectives',
    href: '/org-admin/objectives',
    icon: Target,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  {
    title: 'View Reports',
    description: 'Check organizational analytics',
    href: '/org-admin/reports',
    icon: BarChart3,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }
]

export default function OrgAdminOverview() {
  const { profile } = useProfile()
  const { stats, isLoading, error } = useOrgAdminStats()

  // Use stats if available, otherwise fall back to zeros
  const currentStats = stats || {
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0,
    totalAreas: 0,
    activeAreas: 0,
    totalObjectives: 0,
    completedObjectives: 0,
    overdueObjectives: 0,
    unassignedUsers: 0
  }

  // Dynamic alerts based on actual stats
  const alerts = [
    ...(currentStats.unassignedUsers > 0 ? [{
      id: 1,
      type: 'warning' as const,
      title: 'Unassigned Users',
      message: `${currentStats.unassignedUsers} user${currentStats.unassignedUsers > 1 ? 's' : ''} need to be assigned to areas`,
      href: '/org-admin/users',
      icon: AlertCircle
    }] : []),
    ...(currentStats.pendingInvitations > 0 ? [{
      id: 2,
      type: 'info' as const,
      title: 'Pending Invitations',
      message: `${currentStats.pendingInvitations} invitation${currentStats.pendingInvitations > 1 ? 's are' : ' is'} awaiting response`,
      href: '/org-admin/invitations',
      icon: Clock
    }] : []),
    ...(currentStats.overdueObjectives > 0 ? [{
      id: 3,
      type: 'warning' as const,
      title: 'Overdue Objectives',
      message: `${currentStats.overdueObjectives} objective${currentStats.overdueObjectives > 1 ? 's are' : ' is'} past their target dates`,
      href: '/org-admin/objectives',
      icon: AlertCircle
    }] : [])
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Organization Admin</h1>
        <p className="text-gray-400 mt-2">
          Welcome back, {profile?.full_name}. Manage your organization from this central hub.
        </p>
      </div>

      {/* Key Stats */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{currentStats.totalUsers}</p>
                  <p className="text-xs text-green-400">
                    {currentStats.activeUsers} active
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Areas</p>
                  <p className="text-2xl font-bold text-white">{currentStats.totalAreas}</p>
                  <p className="text-xs text-green-400">
                    {currentStats.activeAreas} active
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Objectives</p>
                  <p className="text-2xl font-bold text-white">{currentStats.totalObjectives}</p>
                  <p className="text-xs text-green-400">
                    {currentStats.completedObjectives} completed
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Target className="h-6 w-6 text-green-400" />
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
                    {currentStats.totalObjectives > 0 
                      ? Math.round((currentStats.completedObjectives / currentStats.totalObjectives) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-green-400">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    +5% this month
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}>
                  <Card className={`border transition-all hover:scale-105 cursor-pointer ${action.color}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="h-5 w-5" />
                        <h3 className="font-medium">{action.title}</h3>
                      </div>
                      <p className="text-sm opacity-75">{action.description}</p>
                      <ArrowRight className="h-4 w-4 mt-2 opacity-50" />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Notifications */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Alerts & Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alert.icon
              return (
                <Link key={alert.id} href={alert.href}>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        alert.type === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          alert.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{alert.title}</h4>
                        <p className="text-sm text-gray-400">{alert.message}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-400">2 hours ago</span>
              <span className="text-white">New user Maria Garcia joined Sales area</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">1 day ago</span>
              <span className="text-white">Objective "Q1 Sales Growth" completed by Sales team</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-400">2 days ago</span>
              <span className="text-white">3 users assigned to new Marketing area</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-400">3 days ago</span>
              <span className="text-white">IT area created with John Smith as manager</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button variant="outline" className="w-full">
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}